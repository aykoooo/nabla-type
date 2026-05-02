import { Bitmap, getSVGData, potraceGetPathList } from "./potrace-plus.esm.js";

self.onmessage = (e) => {
    //let { bmp, options } = e.data;
    let { type, data } = e.data;

    try {
        let result = {}

        // get PathList
        if (type === 'pathlist') {
            let { bmp, options } = data;

            // reassign to class object
            bmp = Bitmap.from(bmp);
            result = potraceGetPathList(bmp, options);
        }
        else if(type === 'svgData'){
            result = getSVGData(data);
        }

        self.postMessage({ result });
    } catch (err) {
        self.postMessage({ error: err.message });
    }
};


