const axios = require('axios');
const Bottleneck = require('bottleneck');
const UserAgent = require('user-agents');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const { setupCache } = require('axios-cache-adapter');
const cheerio = require('cheerio');

const { FetchError } = require('./errors');
const { loadHtml, parseJson, parseXml } = require('./parser');
const HttpService = require('./HttpService');
const JsonLDService = require('./JsonLDService');

axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();
const cache = setupCache({ maxAge: 15 * 60 * 1000 });
const api = axios.create({ adapter: cache.adapter });

class WebExtractor {
    constructor(proxies = [], rateLimit = 1000) {
        this.httpService = new HttpService(proxies);
        this.jsonLDService = new JsonLDService();
        this.rateLimiter = new Bottleneck({ minTime: rateLimit });
    }

    get requestOptions() {
        const userAgent = new UserAgent();
        return {
            jar: cookieJar,
            withCredentials: true,
            headers: { 'User-Agent': userAgent.toString() },
        };
    }

    async fetch(url) {
        const response = await api.get(url, this.requestOptions);
        if (response.status !== 200 || !response.headers['content-type'].includes('text/html')) {
            throw new FetchError(`Invalid response (status: ${response.status}, content-type: ${response.headers['content-type']})`, url);
        }
        return response.data;
    }

    async post(url, data) {
        const response = await api.post(url, data, this.requestOptions);
        return response.data;
    }

    async fetchAndLoad(url) {
        const html = await this.httpService.fetch(url);
        return loadHtml(html);
    }

    async fetchAndParseJsonLD(url) {
        const html = await this.httpService.fetch(url);
        return await this.jsonLDService.parse(html);
    }

    async fetchAndParse(url, type = 'html') {
        const content = await this.fetch(url);
        switch (type) {
            case 'html':
                return loadHtml(content);
            case 'json':
                return parseJson(content);
            case 'xml':
                return await parseXml(content);
            default:
                throw new Error(`Unsupported content type: ${type}`);
        }
    }
}

module.exports = WebExtractor;
