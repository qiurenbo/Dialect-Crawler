import * as request from "request";
import * as puppeteer from "puppeteer";
import * as mkdirp from "mkdirp";
import { createWriteStream, existsSync } from "fs";
let browser: puppeteer.Browser;
let page: puppeteer.Page;

// SPA need some time to render the page
const waitTime = 500;

const refreshPage = async (): Promise<puppeteer.Page> => {
  await page.waitFor(waitTime);
  let pages = await browser.pages();
  page = pages[pages.length - 1];
  return page;
};

const juku = async () => {
  mkdirp.sync("方言句库");
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();

  await page.goto(
    "http://10.1.5.38:8210/jx/List_C.html?guid=d3e87802-5802-4ec6-b078-9c4a087aa8fa"
  );
  await page.waitFor(waitTime);
  let lists = await page.$$("#List_C li a");

  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];

    const text = await (<Promise<string>>(
      (await list.getProperty("innerText")).jsonValue()
    ));
    // Get url
    const url = await (<Promise<string>>(
      (await list.getProperty("href")).jsonValue()
    ));
    let guid = url.match(/guid=(.*)/)[1];

    request.post(
      "http://10.1.5.38:8210/jx/detail.ashx",
      {
        form: { action: "album", guid: guid },
      },
      function (err, httpResponse, body) {
        let res = JSON.parse(body);

        let name1: string, name2: string, url1: string, url2: string;
        if (res.File[0]) {
          name1 = res.File[0].Name;
          url1 = res.File[0].Url;

          const downloadPath = `方言句库/${name1}`;
          if (!existsSync(downloadPath)) {
            request(url1)
              .pipe(createWriteStream(downloadPath))
              .on("finish", () => {
                console.log(`${name1} is finished downloading.`);
              })
              .on("error", (error) => {});
          }
        }
        if (res.File[1]) {
          name2 = res.File[1].Name;
          url2 = res.File[1].Url;
          const downloadPath = `方言句库/${name2}`;
          if (!existsSync(downloadPath)) {
            request(url2)
              .pipe(createWriteStream(downloadPath))
              .on("finish", () => {
                console.log(`${name2} is finished downloading.`);
              })
              .on("error", (error) => {});
          }
        }

        console.log(`${name1}:${url1}`);
        console.log(`${name2}:${url2}`);
      }
    );
  }
  await browser.close();
};

export default juku;
