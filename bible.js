'use strict';

// 聖經json
var categoryData = require('./data/category.json');
var bibleData = require('./data/bible.json');
var chapterData = require('./data/chapter.json');

class SearchObject {
    constructor(inputString) {
        this.keyword = "";
        this.categoryStr = "";
        this.categoryEnd = "";
        this.bibleStartIndex = "";
        this.bibleEndIndex = "";
        this.string2Object(inputString);
    }

    toString() {
        return "keyword:" + this.keyword + ", categoryStr:" + this.categoryStr + ", categoryEnd:" + this.categoryEnd + ", bibleStartIndex:" + this.bibleStartIndex + ", bibleEndIndex:" + this.bibleEndIndex;
    }

    string2Object(inputString) {
        console.log("inputString:" + inputString);
        var chunk = inputString.split(" ");
        this.keyword = chunk[0];
        if (!!chunk[1]) {
            var tempCategoryStr = getCode(categoryData, chunk[1]);
            this.categoryStr = !tempCategoryStr ? chunk[1] : tempCategoryStr;
        } else {
            this.categoryStr = categoryData[0].Code
        }

        if (!!chunk[2]) {
            var tempCategoryEnd = getCode(categoryData, chunk[2]);
            this.categoryEnd = !tempCategoryEnd ? chunk[2] : tempCategoryEnd;
        } else {
            this.categoryEnd = categoryData[categoryData.length - 1].Code;
        }

        this.bibleStartIndex = Number(getIndex(bibleData, this.categoryStr + "1"));
        var endChapter = getDescription(chapterData, this.categoryEnd);
        this.bibleEndIndex = Number(getIndex(bibleData, this.categoryEnd + endChapter));
    }
}

function getSearchContent(searchKey) {
    var searchObject = new SearchObject(searchKey);
    console.log("searchObject:" + searchObject.toString());

    var result = "";
    var count = 0;
    var tempVerse = [];
    for (var i = searchObject.bibleStartIndex; i < searchObject.bibleEndIndex; i++) {

        tempVerse = bibleData[i]
        var verse = Object.keys(tempVerse);

        for (var j = 0; j < tempVerse[verse].length; j++) {
            if (tempVerse[verse][j].indexOf(searchObject.keyword) >= 0) {
                result += verse + ":" + (j + 1) + " ";
                result += tempVerse[verse][j] + "\n";
                if (count > 30) {
                    return result + "\n大於上限~建議至 https://hmlu36.github.io/Bible/ 查詢";
                } else {
                    count++;
                }
            }

        }
    }
    return result;
}


class ReadObject {
    constructor(inputString) {
        this.category = ""; // 目錄
        this.chapter = ""; // 目錄章
        this.verseStr = ""; // 節 開始
        this.verseEnd = ""; // 節 結束
        this.verses = []; // 節
        this.existVerse = false;
        this.splitcharacter = ""; // 分隔符號
        this.string2Object(inputString);
    }

    toString() {
        return "category:" + this.category + ", chapter:" + this.chapter + ", verseStr:" + this.verseStr + ", verseEnd:" + this.verseEnd + ", existVerse:" + this.existVerse + ", splitcharacter:" + this.splitcharacter + ", verses:" + this.verses;
    }

    get verse() {
        return this.category + this.chapter;
    }

    // 將字串轉成ReadObject
    string2Object(inputString) {
        inputString = inputString.replace(/ /g, "");
        if (inputString.indexOf("-") !== -1) {
            this.splitcharacter = "-";
        } else if (inputString.indexOf("~") !== -1) {
            this.splitcharacter = "~";
        } else {
            this.splitcharacter = "";
        }

        var firstDigit = inputString.match(/\d/);
        this.category = inputString.substring(0, inputString.indexOf(firstDigit));
        this.chapter = inputString.substring(inputString.indexOf(firstDigit), inputString.length).split(":")[0];

        var tempVerse = inputString.replace(this.category + this.chapter, "");

        // 判斷是否有輸入節
        if (tempVerse.length > 0) {
            tempVerse = tempVerse.replace(":", "").replace(" ", "");

            // 輸入逗號 和 起迄
            if (tempVerse.indexOf(",") > 0 && !!this.splitcharacter) {
                this.verses = tempVerse.split(",");
                for (let index = 0; index < this.verses.length; ++index) {
                    if (this.verses[index].indexOf(this.splitcharacter) > 0) {
                        var verse = this.verses[index].split(this.splitcharacter);
                        this.verseStr = verse[0];
                        this.verseEnd = verse[1];
                        this.verses = this.verses.filter(item => item !== this.verses[index]);
                    }
                }
            } else {
                // 輸入逗號
                if (tempVerse.indexOf(",") > 0) {
                    this.verses = tempVerse.split(",");
                }
                // 判斷是否有輸入起迄
                else if (!!this.splitcharacter) {
                    var verse = tempVerse.split(this.splitcharacter);
                    this.verseStr = verse[0];
                    this.verseEnd = verse[1];
                } else {
                    this.verseStr = tempVerse;
                    this.verseEnd = this.verseStr;
                }
            }

            this.existVerse = true;
        }

        // 判斷是否須將章節轉為縮寫取資料	
        if (!!getCode(categoryData, this.category)) {
            this.category = getCode(categoryData, this.category);
        }
    }
}

function getReadingContent(readingKey) {

    var readObject = new ReadObject(readingKey);
    console.log("ReadObject:" + readObject.toString());

    var verseContent = null;
    var result = "";
    for (var i = 0; i < bibleData.length; i++) {
        verseContent = bibleData[i][readObject.verse]
        if (!!verseContent) {
            // 有輸入節
            if (readObject.existVerse) {
                // 有輸入逗號、起迄
                if (readObject.verses.length > 0 && (!!readObject.verseStr || !!readObject.verseEnd)) {
                    // 使用另外一個陣列儲存節
                    var tempVerse = [];
                    // 逗號分隔的節
                    readObject.verses.forEach(function(verse) {
                        tempVerse.push(verse);
                    });
                    // 起迄的節
                    for (var j = readObject.verseStr - 1; j < readObject.verseEnd; j++) {
                        tempVerse.push(j);
                    }
                    // 排序
                    tempVerse.sort(function(a, b) {
                        return a - b
                    });
                    // 再逐一列出章節內容
                    tempVerse.forEach(function(verse) {
                        result += (!!result ? "\n" : "") + (!verseContent[verse - 1] ? "" : verseContent[verse - 1]);
                    });

                    // 有輸入逗號
                } else if (readObject.verses.length > 0) {
                    readObject.verses.forEach(function(verse) {
                        result += (!!result ? "\n" : "") + (!verseContent[verse - 1] ? "" : verseContent[verse - 1]);
                    });
                } else if (!!readObject.verseStr || !!readObject.verseEnd) {
                    // 輸入起迄
                    for (var j = readObject.verseStr - 1; j < readObject.verseEnd; j++) {
                        result += (!verseContent[j] ? "" : verseContent[j]);
                    }
                }
                // 沒有輸入節(全部列出來)
            } else {
                for (var j = 0; j < verseContent.length; j++) {
                    result += (!verseContent[j] ? "" : verseContent[j]);
                }
            }

            if (!!result) {
                var composeResult = "「" + result + "」" + "\n" + getDescription(categoryData, readObject.category) + readObject.chapter;
                /*
				// 是否有輸入節
                if (readObject.existVerse) {
                    if (readObject.verses.length > 0) {
                        composeResult += readObject.verses.join(', ');
                    } else {
                        composeResult += ":" + readObject.verseStr;
                        // 是否有輸入結束節
                        if (!!readObject.splitcharacter) {
                            composeResult += readObject.splitcharacter + readObject.verseEnd;
                        }
                    }
				}
				*/

                if (readObject.existVerse) {
                    var firstDigit = readingKey.match(/\d/);
                    this.category = readingKey.substring(0, readingKey.indexOf(firstDigit));
                    this.chapter = readingKey.substring(readingKey.indexOf(firstDigit), readingKey.length).split(":")[0];

                    var tempVerse = readingKey.replace(this.category + this.chapter, "");
                    composeResult += tempVerse;
                }
                return composeResult;
            }
        }
    }
    return "";
}


//========================================================
// 工具用function
//========================================================
/*
	pasrse json array description
	json format : { "Code": "xxx", "Description" : "xxx" }
 */
function getDescription(jsonArray, compareKey) {
    var result = jsonArray.filter(function(entry) {
        return entry["Code"] === compareKey;
    }).map(function(entry) {
        return entry["Description"];
    });
    return result.toString();
}

/*
	pasrse json array code
	json format : { "Code": "xxx", "Description" : "xxx" }
 */
function getCode(jsonArray, compareKey) {
    var result = jsonArray.filter(function(entry) {
        return entry["Description"] === compareKey;
    }).map(function(entry) {
        return entry["Code"];
    });
    return result.toString();
}

function getIndex(jsonArray, compareKey) {
    var result = jsonArray.map(function(entry, i) {
        if (Object.keys(entry) == compareKey) return i;
    }).filter(function(entry) { return entry != undefined; });
    return result;
}

function getDateString() {
    var now = new Date();
    now.setHours(now.getHours() + 8);
    return (now.getMonth() + 1) + "/" + now.getDate();
}

module.exports = {
    getSearchContent,
    getReadingContent,
    getDateString
}