/**
 * スクリプト行の種別
 */
export enum LineType {
  /** セリフ開始: #キャラ名 */
  DialogueStart = "DialogueStart",

  /** セリフ終了: # */
  DialogueEnd = "DialogueEnd",

  /** ラベル定義: *ラベル名 */
  Label = "Label",

  /** コメント: // ... */
  Comment = "Comment",

  /** 空行 */
  Empty = "Empty",

  /** JS式/文: 変数代入、if、choice、関数呼び出しなど */
  Expression = "Expression",
}
