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

const goBack = async (): Promise<void> => {
  await page.waitFor(waitTime);
  await page.goBack();
  await refreshPage();
};

const fangyan = async () => {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();

  await page.goto(
    "http://10.1.5.38:8210/jx/List_B.html?guid=37f0291e-a48d-4235-91c8-ab5f5761a401"
  );
  await page.waitFor(waitTime);
  let lists = await page.$$("#List_B li");

  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];

    // Get category and mkdir
    const category = await list.$eval(
      "a:nth-child(2)",
      (node) => (node as HTMLElement).innerText
    );

    // Go to category detail list
    await (await list.$("a:nth-child(1)")).click();
    page = await refreshPage();

    let detailLists = await page.$$("#List_D a");
    for (let j = 0; j < detailLists.length; j++) {
      const detail = detailLists[j];
      const detailName = await (
        await detail.getProperty("innerText")
      ).jsonValue();

      const dirPath = `方言库/${category}/${detailName}`;
      mkdirp.sync(dirPath);

      // Get detail url
      const url = await (<Promise<string>>(
        (await detail.getProperty("href")).jsonValue()
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

            const downloadPath = `${dirPath}/${name1}`;
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
            const downloadPath = `${dirPath}/${name2}`;
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
    await goBack();
    lists = await page.$$("#List_B li");
  }

  await browser.close();
};
export default fangyan;
