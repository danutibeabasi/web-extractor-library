const cheerio = require('cheerio');
const jsonld = require('jsonld');

class JsonLDService {
  async parse(html) {
    try {
      const $ = cheerio.load(html);
      const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
      const parsedJsonLd = jsonLdScripts.map(script => JSON.parse($(script).html()));
      const compactedJsonLd = await Promise.all(parsedJsonLd.map(data => jsonld.compact(data, {})));
      return compactedJsonLd;
    } catch (error) {
      console.error(`Error parsing JSON-LD from HTML.`);
      throw error;
    }
  }
}

module.exports = JsonLDService;
