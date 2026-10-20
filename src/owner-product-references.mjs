// Unmodified owner attachments. SHA-256 hashes identify the exact input bytes.
export const OWNER_PRODUCT_REFERENCES={
 floorLabel:{image:'/materials/owner-products/MI402439-label.jpg',file:'IMG-20260916-WA0052.jpg',sha256:'899104dc2c4fe9bb18353542deff6fc30edd0c14bae7c27bc987673852fd82af',width:1152,height:1536},
 floorTile:{image:'/materials/owner-products/MI402439-tile.jpg',file:'IMG-20260916-WA0051.jpg',sha256:'b4665fa93f74427970e918e52e810d3b0c6ae7c45df02370c36a969e4937cfd4',width:1152,height:1536},
 sink:{image:'/materials/owner-products/vegas-70-casablanca.jpg',file:'Screenshot_2026-10-09-13-10-28-396_com.android.chrome.jpg',sha256:'653b01bfcf13377d4b9664dce7d555a6c85416c4203178f448340d7a2d46a88b',width:709,height:1536}
};
export const FLOOR_PHOTO={
 ...OWNER_PRODUCT_REFERENCES.floorTile,
 // Label-free square on the actual showroom tile; no invented vein/grain.
 sample:[210,80,880,880],size:1024,previewRgb:[163,155,147],
 textureBasis:'owner-product-photo',photoScaleInferred:true
};
export const OWNER_PRODUCTS_SOURCE={id:'ordered-product-photos',kind:'gallery',he:'הריצוף והכיור שבחרת — צילומי מקור',en:'Your selected floor & sink — original photos',pages:[1,2,3],references:[
 {page:1,...OWNER_PRODUCT_REFERENCES.floorLabel,he:'מדבקת MI402439 — שיק גרניט לבן מט 100×100',en:'MI402439 label — matte white 100×100',noteHe:'צילום המדבקה על האריח שמאמת את הקשר להזמנת חרש. הקובץ המקורי נשמר ללא שינוי.',noteEn:'The photographed tile label matches the Harash order. Original file retained without alteration.'},
 {page:2,...OWNER_PRODUCT_REFERENCES.floorTile,he:'האריח שבחרת — צילום מלא',en:'Your selected tile — full photo',noteHe:'הטקסטורה בתלת־ממד נדגמת מאזור נקי בצילום זה. דוגמת פני האריח מקורית; התאורה בצילום אינה כיול צבע, וקנה המידה של הגרגרים משוער.',noteEn:'The 3D texture samples a clear area of this photo. Pattern is photographed; lighting is not a colour calibration and grain scale is estimated.'},
 {page:3,...OWNER_PRODUCT_REFERENCES.sink,he:'SCHOCK / Aquatop Vegas 70 — קזבלנקה',en:'SCHOCK / Aquatop Vegas 70 — Casablanca',noteHe:'צילום המוצר שצירפת ובחירת קזבלנקה לפי ההבהרה שלך. מידת 69×52 רשומה בצילום; עומק 22 ס״מ לפי גומא.',noteEn:'Your attached product screenshot and explicit Casablanca selection. Screenshot lists 69×52 cm; 22 cm depth follows Goma.'}
]};
