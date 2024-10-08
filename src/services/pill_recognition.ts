import { PillRecognitionDataModel } from '../schema';
import type { TPillRecognitionData } from '../@types/pill_recognition';
import type { TSearchQueryOption, TPillSearchParam } from '../@types/pill_search';
import { logger, generateQueryFilter } from '../utils';

/**
 * 식별 검색을 위한 낱알 식별 데이터 조회
 * @param param 검색 속성
 * @param option 쿼리 옵션
 * @returns
 */
export async function getRecognitionDataForSearch(
  param: TPillSearchParam,
  option?: Partial<TSearchQueryOption>
) {
  // 조회할 컬럼
  const field = {
    ITEM_SEQ: 1,
    ITEM_NAME: 1,
    ENTP_NAME: 1,
    CHARTIN: 1,
    ITEM_IMAGE: 1,
    DRUG_SHAPE: 1,
    COLOR_CLASS1: 1,
    COLOR_CLASS2: 1,
    LINE_FRONT: 1,
    LINE_BACK: 1,
    LENG_LONG: 1,
    LENG_SHORT: 1,
    THICK: 1,
    PRINT_FRONT: 1,
    PRINT_BACK: 1,
    ETC_OTC_CODE: 1,
  };

  const findQuery = await generateQueryFilter(param);

  const { skip, limit } = option || {};

  const recognitionDatas = await PillRecognitionDataModel.find(findQuery, field)
    .skip(skip || 0)
    .limit(limit || 20);

  return recognitionDatas;
}

/**
 * DB에 여러 항목의 알약 식별 정보 데이터 업데이트 요청
 * @param datas 알약 식별 정보 데이터 배열
 */
export async function requestUpdatePillRecognitionDatas(datas: Partial<TPillRecognitionData>[]) {
  if (datas.length === 0) {
    logger.warn(`[PILL-RECOGNITION-SERVICE] No data from excel file.`);
    return;
  }

  try {
    for await (const data of datas) {
      await PillRecognitionDataModel.updateOne({ ITEM_SEQ: data.ITEM_SEQ }, data, {
        new: true,
        upsert: true,
      });
    }
  } catch (e) {
    logger.error('[PILL-RECOGNITION-SERVICE] Fail to update datas. %s', e.stack || e);
  }
}
