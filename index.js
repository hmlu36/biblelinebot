'use strict';

var linebot = require('linebot');
var express = require('express');
const app = express();


const defaultAccessToken = '***********************';
const defaultSecret = '***********************';

//========================================================
// 設定資料
//========================================================
var bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET || defaultSecret,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || defaultAccessToken
});

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
		this.bibleEndIndex = Number(getIndex(bibleData, this.categoryEnd  + endChapter));
	}
}

class ReadObject {
	constructor(inputString) {
		this.category = ""; // 目錄
		this.chapter = "";  // 目錄章
		this.verseStr = ""; // 節 開始
		this.verseEnd = ""; // 節 結束
		this.existVerse = false; 
		this.splitcharacter = ""; // 分隔符號
		this.string2Object(inputString);
	}
	
	toString() {
		return "category:" + this.category + ", chapter:" + this.chapter + ", verseStr:" + this.verseStr + ", verseEnd:" + this.verseEnd + ", existVerse:" + this.existVerse + ", splitcharacter:" + this.splitcharacter;
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

		// 判斷是否有輸入節
		if (inputString.replace(this.category + this.chapter, "").length > 0) {
			if (!!this.splitcharacter) {
				var verse = inputString.replace(this.category + this.chapter + ":", "").split(this.splitcharacter);
				this.verseStr = verse[0];
				this.verseEnd = verse[1];
			} else {
				this.verseStr = inputString.replace(this.category + this.chapter + ":", "");
				this.verseEnd = this.verseStr;
			}
			this.existVerse = true;
		}
		
		// 判斷是否須將章節轉為縮寫取資料	
		if (!!getCode(categoryData, this.category)) {
			this.category = getCode(categoryData, this.category);
		}
	}
}

//========================================================
// 導頁網址
//========================================================
app.get('/', (req, res) => {
  res.send('Hello World!');
});

const linebotParser = bot.parser();
app.post('/callback', linebotParser);

//========================================================
// 處理監聽訊息
//========================================================
bot.on('message', function (event) {
	event.reply(analysisInput(event.message.text))
	.then(function (data) {
		// success
	}).catch(function (error) {
		console.log(error);
	});
});

app.listen(process.env.PORT || 3000, () => {
	console.log('Example app listening on port 3000!')
})

function analysisInput(input) {
	
	if (input.indexOf("小幫手") !== -1) {
		return ["小幫手來囉~👼🏼\n需要甚麼協助!?🙏🏼",
				"",
                "聖經查詢 \"(默想經文) 目錄章:起-訖\"",
				"範例：默想經文 創1:1-2",
				"[目錄] 可輸入全名或縮寫",
				"[章節] 不輸入會列出全章",
				"[默想經文] 可不輸入",
				"輸入會加入\"今日默想經文 月/日\"",
				"",
				"關鍵字查詢 \"關鍵字 查詢字 (起始目錄) (結束目錄)\"",
				"範例：關鍵字 戶勒大 王上 代下",
				"啟始結束章節未輸入預設為全部",
				"符合經文最多列出30列",
				"",
				"以上希望有幫到您~☺️"].join('\n');
	} else if (input.indexOf("log") !== -1) {
		return "https://dashboard.heroku.com/apps/biblelinebot/logs";
	} else if (input.indexOf("heroku") !== -1) {
		return "https://dashboard.heroku.com/apps/biblelinebot";	
	} else if (input.indexOf("後台") !== -1) {
		return "https://developers.line.me/console/";
	} else if (input.indexOf("官方帳號") !== -1) {
		return "https://admin-official.line.me/";
	} else if (input.indexOf("關鍵字") !== -1) {
		var content = getSearchContent(input.replace("關鍵字 ", ""));
		return !content ? "查無資料耶~ 😅" : content;
	} else {
		var content = getReadingContent(input.replace("默想經文", ""));
		if (!content) {
			return "查無資料耶~ 😅";
		} else {
			if (input.indexOf("默想經文") !== -1) {
				content = "今日默想經文 " + getDateString() + "\n" + content;
			}
			return content;
		}
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
				result += verse + ":" + (j+1) + " ";
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

function getReadingContent(readingKey) {

	var readObject = new ReadObject(readingKey);
	console.log("ReadObject:" + readObject.toString());
	
	var verseContent = null;
	var result = "";
	for (var i = 0; i < bibleData.length; i++) {
		verseContent = bibleData[i][readObject.verse]
		if(!!verseContent) {
			// 有輸入節
			if (readObject.existVerse) {
				for (var j = readObject.verseStr - 1; j < readObject.verseEnd; j++) {	
					result += (!verseContent[j] ? "" : verseContent[j]);
				}
			// 沒有輸入節(全部列出來)
			} else {
				for (var j = 0; j < verseContent.length; j++) {
					result += (!verseContent[j] ? "" : verseContent[j]);
				}
			}
			
			if (!!result) {
				var composeResult = "「" + result + "」" + "\n" + getDescription(categoryData, readObject.category) + readObject.chapter;
				// 是否有輸入節
				if (readObject.existVerse) {
					composeResult += ":" + readObject.verseStr;
					// 是否有輸入結束節
					if(!!readObject.splitcharacter) {
						composeResult += readObject.splitcharacter	+ readObject.verseEnd;
					}
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
	var result = jsonArray.filter(function (entry) {
					return entry["Code"] === compareKey;
				}).map(function (entry) {
					return entry["Description"];
				});
	return result.toString();
}

/*
	pasrse json array code
	json format : { "Code": "xxx", "Description" : "xxx" }
 */
function getCode(jsonArray, compareKey) {
	var result = jsonArray.filter(function (entry) {
					return entry["Description"] === compareKey;
				}).map(function (entry) {
					return entry["Code"];
				});
	return result.toString();
}

function getIndex(jsonArray, compareKey) {
	var result = jsonArray.map(function(entry, i){
		if(Object.keys(entry) == compareKey) return i;
	}).filter(function(entry){ return entry!=undefined; });
	return result;
}

function getDateString() {
	var now = new Date();
	now.setHours(now.getHours() + 8);
	return (now.getMonth()+1) + "/" + now.getDate();
}