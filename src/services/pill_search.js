const axios = require('axios');
const _ = require('lodash');
const {
  readPillRecognitionData,
  readDrugPermissionData,
} = require('../queries');
const { logger } = require('../util');
const { generateOperatorForRecognition } = require('../util');
const { imageSearch, detailSearch } = require('../../res/config.json');

/**
 * 낱알 식별 검색
 * @param {Object} whereData DB 쿼리를 위한 데이터 ex) { PRINT: '~~', CHRTIN: '~~', ... }
 * @param {Object} func 페이징 등 쿼리에 실행할 연산 ex) { skip: 0, limit: 10 }
 * @returns {Object}
 */
async function searchRecognition(whereData, func) {
  // DB 쿼리 조건
  const operatorForRecognition = await generateOperatorForRecognition(
    whereData
  );

  // 조회할 컬럼
  const recogFileds = {
    ITEM_SEQ: 1,
    ITEM_NAME: 1,
    ENTP_NAME: 1,
    CHARTN: 1,
    ITEM_IMAGE: 1,
    DRUG_SHAPE: 1,
    COLOR_CLASS1: 1,
    COLOR_CLASS2: 1,
    LINE_FRONT: 1,
    LINE_BACK: 1,
  };

  return readPillRecognitionData(operatorForRecognition, recogFileds, func);
}

/**
 * 의약품 허가 정보 조회
 * @param {Object} where 검색 조건
 * @returns {Object}
 */
async function searchPermission(where) {
  // 조회할 컬럼
  const permFileds = {
    ITEM_SEQ: 1,
    DRUG_SHAPE: 1,
    MAIN_ITEM_INGR: 1,
    INGR_NAME: 1,
    MATERIAL_NAME: 1,
    PACK_UNIT: 1,
    VALID_TERM: 1,
    STORAGE_METHOD: 1,
  };

  return readDrugPermissionData(where, permFileds);
}

/**
 * 개요 검색
 * @param {Object} whereData DB 쿼리를 위한 데이터 ex) { PRINT: '~~', CHRTIN: '~~', ... }
 * @param {Object} func 페이징 등 쿼리에 실행할 연산 ex) { skip: 0, limit: 10 }
 * @returns {Object}
 */
async function searchOverview(whereData, func) {
  try {
    // 낱알 식별 정보
    const recognitionDatas = await searchRecognition(whereData, func);

    if (recognitionDatas.length === 0) {
      return { isSuccess: false, message: '식별된 정보가 없습니다.' };
    }

    // 의약품 허가 정보 검색 조건
    const operatorForPermission = {
      ITEM_SEQ: { $in: recognitionDatas.map(({ ITEM_SEQ }) => ITEM_SEQ) },
    };

    // 의약품 허가 정보
    const permissionDatas = await searchPermission(operatorForPermission);

    // 알약 식별 정보 및 허가 정보 쿼리 결과에 대해 항목마다 병합
    const result = recognitionDatas.map((recognitionData) => {
      const permissionData = permissionDatas.find(
        (v) => v.ITEM_SEQ === recognitionData.ITEM_SEQ
      );
      return _.merge(recognitionData, permissionData);
    });

    return { isSuccess: true, data: result };
  } catch (e) {
    logger.error(
      `[RECOG-SERVICE] Fail to recognition search.\nwhereData: ${whereData}\n${e.stack}`
    );
    return { isSuccess: false, message: '식별 검색 중 오류가 발생 했습니다.' };
  }
}

/**
 * 이미지를 인식하는 딥러닝 서버로 이미지를 전달 후 개요 검색 수행
 * @param {Object} imageData base64 이미지 코드 ex) { base64Url }
 * @param {Object} func 페이징 등 쿼리에 실행할 연산 ex) { skip: 0, limit: 10 }
 * @returns {Object}
 */
async function searchFromImage(imageData, func) {
  let recognizeResult;
  const { base64Url } = imageData;

  try {
    // 1. DL 서버 API 호출
    const { devUrl, prodUrl } = imageSearch;
    const url = process.env.NODE_ENV === 'production' ? prodUrl : devUrl;

    // { PRINT, DRUG_SHAPE }
    const result = await axios({
      method: 'post',
      url,
      data: { img_base64: base64Url },
    });

    const resultData = JSON.parse(result.data);
    if (!resultData.is_success) {
      return { isSuccess: false, message: resultData?.message };
    }

    recognizeResult = {
      PRINT: resultData.data[0].print || '',
      CHARTN: resultData.data[0].chartn || '',
      DRUG_SHAPE: resultData.data[0].durg_shape || '',
      COLOR_CLASS: resultData.data[0].color_class || '',
      LINE: resultData.data[0].line || '',
    };

    // 2. 개요 검색 호출
    return searchOverview(recognizeResult, func);
  } catch (e) {
    logger.error(
      `[RECOG-SERVICE] Fail to image search.\nimageData: ${JSON.stringify(
        imageData
      )}\n${e.stack}`
    );
    return {
      isSuccess: false,
      message: '이미지 검색 중 오류가 발생 했습니다.',
    };
  }
}

/**
 * 알약에 대한 상세 검색 (의약품 허가 정보)
 * @param {string} itemSeq API 호출을 위한 옵션인 알약 제품 일련 번호
 * @returns 검색 결과 데이터
 */
async function searchDetail(itemSeq) {
  try {
    // API URL 및 서비스키
    const { url, encServiceKey } = detailSearch;

    let apiUrl = `${url}`;
    apiUrl += `?serviceKey=${encServiceKey}`;
    apiUrl += `&type=json`;
    apiUrl += `&item_seq=${itemSeq.ITEM_SEQ}`;
    apiUrl += `&pageNo=1&numOfRows=20`;

    const result = await axios({ method: 'get', url: apiUrl });
    const { ITEM_SEQ, EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA } =
      result.data.body.items[0];

    return {
      isSuccess: true,
      data: [{ ITEM_SEQ, EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA }],
    };
  } catch (e) {
    logger.error(
      `[RECOG-SERVICE] Fail to call api.\nitemSeq: ${itemSeq}\n${e.stack}`
    );
    return { isSuccess: false, message: '상세 검색 중 오류가 발생했습니다.' };
  }
}

module.exports = {
  searchOverview,
  searchFromImage,
  searchDetail,
};