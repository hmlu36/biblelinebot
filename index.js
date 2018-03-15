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


class QueryObject {
	constructor(queryString) {
		this.category = "";
		this.chapter = "";
		this.verseStr = "";
		this.verseEnd = "";
		this.existVerse = false;
		this.splitcharacter = "";
		this.string2Object(queryString);
	}
	
	toString() {
		return "category:" + this.category + ", chapter:" + this.chapter + ", verseStr:" + this.verseStr + ", verseEnd:" + this.verseEnd + ", existVerse:" + this.existVerse + ", splitcharacter:" + this.splitcharacter;
	};
	
	get verse() {
		return this.category + this.chapter;
	}
	
	
	// 將字串轉成QueryObject
	string2Object(queryString) {
		queryString = queryString.replace(/ /g, "");
		if (queryString.indexOf("-") !== -1) {
			this.splitcharacter = "-";
		} else if (queryString.indexOf("~") !== -1) {
			this.splitcharacter = "~";
		} else {
			this.splitcharacter = "";
		}
		
		var firstDigit = queryString.match(/\d/);
		this.category = queryString.substring(0, queryString.indexOf(firstDigit));
		this.chapter = queryString.substring(queryString.indexOf(firstDigit), queryString.length).split(":")[0];

		// 判斷是否有輸入節
		if (queryString.replace(this.category + this.chapter, "").length > 0) {
			if (!!this.splitcharacter) {
				var verse = queryString.replace(this.category + this.chapter + ":", "").split(this.splitcharacter);
				this.verseStr = verse[0];
				this.verseEnd = verse[1];
			} else {
				this.verseStr = queryString.replace(this.category + this.chapter + ":", "");
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
                "聖經查詢範例 \"默想經文 創1:1-2\"",
				"目錄 可輸入全名或縮寫",
				"章節 不輸入會列出全章",
				"默想經文 可不輸入",
				"輸入會加入\"今日默想經文 月/日\"",
				"關鍵字查詢範例 \"關鍵字 戶勒大\"",
				"符合經文最多列出25列",
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
		var content = searchBibleContent(input.replace("關鍵字", "").replace(" ", ""));
		return !content ? "查無資料耶~ 😅" : content;
	} else {
		var content = getBibleContent(input.replace("默想經文", ""));
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

function getBibleContent(searchKey) {

	var queryObject = new QueryObject(searchKey);
	console.log("QueryObject:" + queryObject.toString());
	
	var verseContent = null;
	var result = "";
	for (var i = 0; i < bibleData.length; i++) {
		verseContent = bibleData[i][queryObject.verse]
		if(!!verseContent) {
			// 有輸入節
			if (queryObject.existVerse) {
				for (var j = queryObject.verseStr - 1; j < queryObject.verseEnd; j++) {	
					result += (!verseContent[j] ? "" : verseContent[j]);
				}
			// 沒有輸入節(全部列出來)
			} else {
				for (var j = 0; j < verseContent.length; j++) {
					result += (!verseContent[j] ? "" : verseContent[j]);
				}
			}
			
			if (!!result) {
				var composeResult = "「" + result + "」" + "\n" + getDescription(categoryData, queryObject.category) + queryObject.chapter;
				// 是否有輸入節
				if (queryObject.existVerse) {
					composeResult += ":" + queryObject.verseStr;
					// 是否有輸入結束節
					if(!!queryObject.splitcharacter) {
						composeResult += queryObject.splitcharacter	+ queryObject.verseEnd;
					}
				}
				return composeResult;
			}
		}
	}
	return "";
}

function searchBibleContent(searchWord) {
	console.log(searchWord);
	var result = [];
	var tempVerse = [];
	for (var i = 0; i < bibleData.length; i++) {
		tempVerse = bibleData[i]
		var verse = Object.keys(tempVerse);
		
		for (var j = 0; j < tempVerse[verse].length; j++) {
			if (tempVerse[verse][j].indexOf(searchWord) >= 0) {
				//console.log(tempVerse[verse][j]);
				if (result.length > 0) {
					result.push("\n");
				} 
				result.push(verse + ":" + (j+1) + " " + tempVerse[verse][j]);
				
				if (result.length >= 50){
					console.log("search finish!");
					result.push("大於上限~建議至 https://hmlu36.github.io/Bible/ 查詢");
					return result.join("");
				}
			}
		}
	}
	console.log("search finish!");
	return result.join("");
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

function getDateString() {
	var now = new Date();
	now.setHours(now.getHours() + 8);
	return (now.getMonth()+1) + "/" + now.getDate();
}