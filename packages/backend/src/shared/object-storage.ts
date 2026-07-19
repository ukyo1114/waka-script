/**
 * オブジェクトストレージ（将来 AWS S3）。
 * アバター画像は同一キーへ上書きし、公開 URL は変えない。
 */
export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<void>;
}

/** S3 実装用の骨格。接続後に中身を埋める。 */
export class ObjectStorageImpl implements ObjectStorage {
  putObject(_input: PutObjectInput): Promise<void> {
    throw new Error("ObjectStorage is not implemented yet");
  }
}
