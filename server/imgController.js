const { rgba, redLevel, greenLevel, blueLevel } = require("./../rgba.js");
const { decodeGamma8Bit } = require('../srgb.js');
const { lightnessToASCII, lightnessToGrayscale, rgbaGradient } = require("../colorpropconvert.js");
const { relativeLuminence, lightness, normalRLuminence } = require("./../cie.js");
const { loadChanTreeFile, randomColorFromChanTreeBuff } = require("./../writeBrightnessFiles.js");
const treeBuffPath = '255buff/ct' //'cieBuff/ct'

function imgToRGBA(rawImgData) {
    //check if raw stream is an array and if it is divisible by 4
    let colorList = [];
    let colorChannels = [];
    for (let i = 1; i <= rawImgData.length; i ++) {
        colorChannels.push(rawImgData[i - 1]);
        if (i % 4 === 0) {
            colorList.push(rgba.apply(null, colorChannels));
            colorChannels = [];
        }
    }
    return colorList;
}

function ASCIIVectorToImage(ASCIIVector, imageWidth, xPadding=1) {
    if (ASCIIVector.length % imageWidth !== 0) {
        return null;
    }
    let output = ""
    for (let i = 0; i < ASCIIVector.length; i++) {
        if ((i + 1) % imageWidth == 0) {
            output += "<br/>";
        }
        for (let r = 1; r <= xPadding; r++) {
            output += ASCIIVector[i];
        }    
    }
    return output;
}

function imgtoLight(rawImgData, discrete=false) {
    let RGBAImg = imgToRGBA(rawImgData);
    let relativeLuminenceVector = RGBAImg.map( 
        color => normalRLuminence(
            relativeLuminence(
                decodeGamma8Bit(redLevel(color)),
                decodeGamma8Bit(greenLevel(color)),
                decodeGamma8Bit(blueLevel(color))
            )
        )
    );
    let lightnessVector = relativeLuminenceVector.map( 
        Y => discrete ? Math.round(255 * (lightness(Y) / 100)) : lightness(Y)
    );
    return lightnessVector;
}

function randLGrad(startL, endL) {
    let strtFN = treeBuffPath + startL;
    let endFN =  treeBuffPath + endL;
    let strtBuff = loadChanTreeFile(strtFN);
    let endBuff = loadChanTreeFile(endFN)
    let strtColor = randomColorFromChanTreeBuff(strtBuff, [1,0,2]);
    let endColor = randomColorFromChanTreeBuff(endBuff, [1,0,2]);
    let range = Math.abs(startL - endL);
    return rgbaGradient(strtColor, endColor, range + 1);
}

module.exports = {
    "rawImgtoASCII" : (rawImgData, imageWidth, padding) => {     
        let lightnessVector = imgtoLight(rawImgData, false);
        let ASCIIVector = lightnessVector.map( 
            light => lightnessToASCII(light)
        );
        let textImage = ASCIIVectorToImage(ASCIIVector, imageWidth, padding);
        return textImage;
    },
    "rawImgtoGrayscale" : (rawImgData) => {
        let lightnessVector = imgtoLight(rawImgData, false);
        let grayImg = lightnessVector.map( 
            L => lightnessToGrayscale(L)
        );
        return grayImg;
    },
    "rawImgtoRand": (rawImgData) => {
        let lightnessVector = imgtoLight(rawImgData, true);
        let cachedBuffers = {};
        let randImg = lightnessVector.map( L => {
            let buff;
            if (!cachedBuffers[L]) {
                let filename = treeBuffPath + L;
                buff = loadChanTreeFile(filename);
                cachedBuffers[L] = buff;
            } else {
                buff = cachedBuffers[L];
            }
            let color = randomColorFromChanTreeBuff(buff, [1,0,2]);
            return rgba(color[0], color[1], color[2]);
        });
        return randImg;
    },
    "imgtoRandLayer" : (rawImgData) => {
        let lightnessVector = imgtoLight(rawImgData, true);
        let colorCache = {};
        let randImg = lightnessVector.map( L => {
            let color;
            if (colorCache[L]) {
                color = colorCache[L];
            } else {
                let filename = treeBuffPath + L;
                let buff = loadChanTreeFile(filename);
                color = randomColorFromChanTreeBuff(buff, [1,0,2]);
                colorCache[L] = color;
            }

            return rgba(color[0], color[1], color[2]);
        });
        return randImg;
    },
    "imgtoRandLightGradient" : (rawImgData, n) => {
        let lightnessVector = imgtoLight(rawImgData, true);
        let lightGrad = [];
        lightGrad[100] = [255, 255, 255, 255];

        for (let i = 0; i < 100; i += 10) {
            let filename = treeBuffPath + i;
            let buff = loadChanTreeFile(filename);
            color = randomColorFromChanTreeBuff(buff, [1,0,2]);
            lightGrad[i] = rgba(color[0], color[1], color[2]);
        }
        for (let i = 0; i < 100; i += 10) {
            let gradient = rgbaGradient(lightGrad[i], lightGrad[i + 10], 11);
            for (let m = 1; m < gradient.length - 1; m++) {
                lightGrad[i + m] = gradient[m];
            }
        }
        //console.log(lightGrad)
        let gradImg = lightnessVector.map( L => lightGrad[L]);
        //onsole.log(gradImg.length * 4);
        return gradImg;
    },
    "imgtoLight" : imgtoLight,
    "randLGrad" : randLGrad,
    "genXColorsOfLight" : (x, L) => {
        let chanTreeBuffer = loadChanTreeFile(filename);
        let colors = []
        for (let i = 0; i < x; i++) {
            let r = randomColorFromChanTreeBuff(chanTreeBuffer, [1,0,2]);
            for (let s = 0; s < r.length; s++) {
                if (r[s] > 255 || r[s] < 0) {
                    console.log("!!! " + r)
                }
            }
            colors.push(rgba(r[0], r[1], r[2]));
        }
        return colors;
    }
}
