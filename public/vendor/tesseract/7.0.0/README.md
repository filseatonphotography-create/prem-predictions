Tesseract assets for Fantasy IQ screenshot import

Source packages:
- tesseract.js 7.0.0, Apache-2.0, worker: worker/worker.min.js
- tesseract.js-core 7.0.0, Apache-2.0, core/WASM runtime: core/*.wasm.js and core/*.wasm
- @tesseract.js-data/eng 1.0.0, MIT, English traineddata: lang/eng/4.0.0_best_int/eng.traineddata.gz

Only English language data is included. These files are served as static first-party assets so screenshot OCR does not depend on the default third-party CDN runtime paths.
