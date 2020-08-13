'use strict';
const { stridesFrom } = require('./array_util.js');
//End operator is Infinity
const isEndOperator = symbol => (!isNaN(symbol) && !isFinite(symbol));
//Range operator is an empty array
const isRangeOperator = symbol => (Array.isArray(symbol) && symbol.length === 0);
const isIndex = (symbol, max, min=0) => (Number.isInteger(symbol) && symbol >= min && symbol < max);

const trimRangedIndex = (tensorIndex) => {
    let newEnd = tensorIndex.length - 1;
    for (let i = newEnd; i >= 0; i--) {
        if (!(isRangeOperator(tensorIndex[newEnd]) || isEndOperator(tensorIndex[newEnd]))) {
            return tensorIndex.slice(0, newEnd + 1);
        }
    }
    return tensorIndex.slice(0,1);
}

const isRangedIndex = function(rangedIndex, shape) {
    let isRanged = false;
    for (let dim in rangedIndex) {
        let index = rangedIndex[dim];
        let length = shape[dim];

        if (isRangeOperator(index) || isEndOperator(index)) {
            isRanged = true;
        } else if (Array.isArray(index)) {
            let ii = 0;
            while(ii < index.length) {
                if (isRangeOperator(index[ii])) {
                    //'Range Operator is not between valid indices or the End Operator'
                    return null;
                }
                if (isEndOperator(index[ii])) {
                    if (isRangeOperator(index[ii + 1])) {
                        if (!(isEndOperator(index[ii + 2]) || isIndex([ii + 2], length))) {
                            //'Range Operator is not between valid indices or the End Operator'
                            return null;
                        }
                        ii += 3;
                    } else {
                        //'End Operator is not followed or preceded by the Range Operator'
                        return null;
                    }
                } else if (isIndex(index[ii])) {
                    if (isRangeOperator(index[ii + 1])) {
                        if (!(isEndOperator(index[ii + 2])) || isIndex(index[ii + 2], length, index[ii])) {
                            //`Value following Range Operator ${index[ii + 2]} is not a valid index or End Operator`
                            return null;
                        }
                        ii += 3;
                    } else {
                        ii += 1;
                    }
                } else {
                    //Range Index Value ${index[ii]} is neither the End or Range Operators, nor a valid index
                    return null;
                }
            }
            isRanged = true;
        } else if (!isIndex(index, shape[dim])) {
            return null;
        }
    }
    return isRanged;
}

const reduceRangedIndex = function(rangedIndex, shape) {
    let reduced = [];
    for (let dim in rangedIndex) {
        let index = rangedIndex[dim];
        let length = shape[dim];
        if (isRangeOperator(index) || isEndOperator(index)) {
            reduced[dim] = [[0, length - 1]];
        } else if (isIndex(index, length)) {
            reduced[dim] = [index];
        } else if (Array.isArray(index)) {
            let rdim = [];
            let ii = 0;
            while(ii < index.length) {
                let pre;
                let post;
                if (isRangeOperator(index[ii])) {
                    throw new Error(`Range Operator is not between valid indices or the End Operator`);
                }
                if (isEndOperator(index[ii])) {
                    pre = 0;
                    if (isRangeOperator(index[ii + 1])) {
                        if (isEndOperator(index[ii + 2])) {
                            post = length - 1;
                        } else if (isIndex(index[ii + 2], length)) {
                            post = index[ii + 2];
                        } else {
                            throw new Error(`Range Operator is not between valid indices or the End Operator`);
                        }
                        ii += 3;
                    } else {
                        throw new Error(`End Operator is not followed or preceded by the Range Operator`);
                    }
                } else if (isIndex(index[ii])) {
                    let pre = index[ii];
                    if (isRangeOperator(index[ii + 1])) {
                        if (isEndOperator(index[ii + 2])) {
                            post = length - 1;
                        } else if (isIndex(index[ii + 2], length, index[ii])) {
                            post = index[ii + 2];
                        } else {
                            throw new Error(`Value following Range Operator ${index[ii + 2]} is not a valid index or End Operator`);
                        }
                        ii += 3;
                    } else {
                        ii += 1;
                    }
                }
                if (post) {
                    if (pre === post) {
                        rdim.push(pre);
                    } else {
                        rdim.push([pre, post]);
                    }
                } else {
                    rdim.push(pre);
                }
            }
            reduced[dim] = rdim;
        } else {
            throw new Error(`Ranged Index ${index} is neither a Range or End Operator, nor a valid index`);
        }
    }
    return reduced;
}

const reducedIndexStride = function(reduced) {
    let cardinal = [];
    for (let dim in reduced) {
        let index = reduced[dim];
        let sum = 0;

        for (let range of index) {
            sum += Array.isArray(range) ? (range[1] - range[0]) : 1;
        }
        cardinal[dim] = sum;
    }
    return stridesFrom[cardinal];
}

module.exports = {
    isRangedIndex,
    reduceRangedIndex,
    trimRangedIndex,
    reducedIndexStride,
}