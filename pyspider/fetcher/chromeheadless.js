'use strict';

const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors');
const Koa = require('./node_modules/koa')
var bodyParser = require('koa-bodyparser');

var app = new Koa()
app.use(bodyParser());
// 获取到系统指定跑在哪个端口
const port = process.argv[2]

// 定义koa所运行的内容
app.use(async (ctx,next) => {
	await next();
	if(ctx.request.method == 'POST') {
		console.log("koa is runing !")
		const fetch = JSON.parse(ctx.request.rawBody)
		console.log(JSON.stringify(fetch,null,2))
		(async () => {
			let result = await {}
			try{
				// 用于存储结果
				await console.log("fetch的内容："+ JSON.stringify(fetch))
				const start_time = await Date.now()
				let end_time = await null,
					first_response = await null,
					finished = await false,
					page_loaded = await false;

				fetch = await JSON.parse(fetch)
				await console.log("服务器接收到的数据：　"+fetch.url);
				// 是否启用代理
				if (fetch.proxy && fetch.proxy.includes("://")) {
					fetch.proxy = '--proxy-server=' + fetch.proxy.replace(/http:\/\//,"").replace(/https:\/\//,"")
				}else if (fetch.proxy){
					fetch.proxy = '--proxy-server=' + fetch.proxy
				}
				if (fetch.proxy) {
					browser = await puppeteer.launch({
						headless: false,
						args: [fetch.proxy]
					});
				}else{
					browser = await puppeteer.connect({browserWSEndpoint})
				}

				const page = await browser.newPage();
				// 设置浏览器视窗的大小

				// 选择设备
				if (fetch.devices) {
					await page.emulate(devices[fetch.devices]);
				}else{
					await page.setViewport({
						width:fetch.js_viewport_width || 1024,
						height:fetch.js_viewport_width || 768*3
					})
				}

				// 进入被抓取的页面
				const response = await page.goto(fetch.url)
				await page.waitFor(3000)

				// 页面加载完毕时输出
				await page.once('load',() => console.log(" page load finished !!! "))

				// 监听网页的console输出的内容
				await page.on('console', msg => {
					if (typeof msg === 'object') {
						console.log(msg.text())
					}else{
						console.log(msg)
					}
				})

				// 翻页
				if (fetch.next) {
					while(true) {
						const next = await page.$(fetch.next);
						if (next) {
							await next.click();
							await page.waitFor(fetch.pageInterval)
						}else{
							break
						}
					}
				}
				await console.log('我来了！！！！！')
				// 滚动
				let scrollStep = await fetch.scrollStep; //每次滚动的步长
				let scrollEnable = await fetch.scrollEnable // 是否需要启动滚动
				let scrollPosition = await fetch.scrollPosition // 滚动到哪个位置
				while (scrollEnable) {
					scrollEnable = await page.evaluate((scrollStep,scrollPosition) => {
						let scrollTop = document.scrollingElement.scrollTop;
						document.scrollingElement.scrollTop = scrollTop + scrollStep;
						if (scrollPosition) {
							return fetch.scrollPosition > scrollTop + 768 ? true : false
						}else{
							return document.body.clientHeight > scrollTop + 768 ? true : false
						}
					}, scrollStep,scrollPosition);
					await page.waitFor(fetch.scrollTime) // 每次滚动的间隔时间
				}

				// 点击
				if(fetch.click_list.length !== 0){
					const click_list = await fetch.click_list
					for (let key in click_list) {
						let click_ele = await page.$(click_list[key])
						await click_ele.click()
						await page.waitFor(300)
					}
				}

				const content = await page.content()
				result = await {
						orig_url: fetch.url,
						status_code: response.status() || 599,
						error: null,
						content: content,
						headers: response.headers(),
						url: page.url(),
						cookies: page.cookies(fetch.url),
						time: (Date.now() - start_time) / 1000,
						js_script_result: null,
						save: fetch.save
					}
				await page.close()
			}catch(e){
				result = await {
					orig_url: fetch.url,
					status_code: response.status() || 599,
					error: e.toString(),
					content: content,
					headers: response.headers(),
					url: page.url(),
					cookies: page.cookies(fetch.url),
					time: (Date.now() - start_time) / 1000,
					js_script_result: null,
					save: fetch.save
				}
				page.close()
			}

			const body = await JSON.stringify(result, null, 2)

			await response.writeHead(200, {
				'Cache': 'no-cache',
				'Content-Type': 'application/json',
			})
			await response.write(body)
			await response.end()

		})()


	} else {
		console.log("forbidden!!!")
		const body = "method not allowed !!! "
		ctx.response.statusCode = 403;
		ctx.response.set({
			'Cache': 'no-cache',
        	'Content-Length': body.length
		})
		ctx.response.body = `<h1>${body}</h1>`;
	}
});

app.listen(port)

// 启动puppeteer，并断开与浏览器的连接
if (app) {
	puppeteer.launch({headless: false,}).then(async browser => {
   		// 保存 Endpoint，这样就可以重新连接 Chromium
    	const browserWSEndpoint = await browser.wsEndpoint();
    	// 从Chromium 断开连接
    	await browser.disconnect();
	});
	console.log('chromeheadless fetcher runing on port ' + port)
}else{
	console.log('Error: Could not create web server listening on port ' + port);
}