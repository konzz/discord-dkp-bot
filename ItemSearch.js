const jsdom = require('jsdom');
const { JSDOM } = jsdom;

module.exports = class ItemSearch {
    constructor() {
    }

    async searchItem(search) {
        //check if search is a number
        const isNumber = /^\d+$/.test(search);
        if (isNumber) {
            return this.searchItemById(search);
        }

        const searchUrl = `https://www.takproject.net/allaclone/items.php?iname=${search}&isearch=Search`;
        const response = await fetch(searchUrl);
        const data = await response.text();

        if (data.includes('search-item-list')) {
            return this.processTable(data);
        }

        if (data.includes('item-info')) {
            const url = response.url;
            const id = url.split('=')[1];

            return this.processItem(data, id, url);
        }

        return null;
    }

    processTable(html) {
        const dom = new JSDOM(html);

        const items = Array.from(dom.window.document.querySelectorAll('.search-item-list table tr')).map(tr => {
            const tds = Array.from(tr.querySelectorAll('td'));
            if (tds.length < 8) {
                return null;
            }

            const id = tds[8].textContent;
            const name = tds[1].textContent;
            const type = tds[2].textContent;

            return { id, name, type };
        });

        return items.filter(item => item);
    }


    processItem(html, id = '', searchUrl = '') {
        const dom = new JSDOM(html);

        const paragraphs = Array.from(dom.window.document.querySelectorAll('.item-stats p')).map(p => p.textContent);

        const brs = Array.from(dom.window.document.querySelectorAll('.item-stats br')).map((br, i) => {
            const previousSibling = br.previousSibling;
            const nextSibling = br.nextSibling;
            if (previousSibling && previousSibling.nodeType === dom.window.Node.TEXT_NODE) {
                return previousSibling.textContent;
            }
            if (nextSibling && nextSibling.nodeType === dom.window.Node.TEXT_NODE) {
                return nextSibling.textContent;
            }
            return null;
        }).filter(text => text);

        const lines = [...paragraphs, ...brs];
        const uniqueLines = lines.filter((line, index) => lines.indexOf(line) === index);

        const item = {
            id: id.toString(),
            name: dom.window.document.querySelector('.item-info > strong').textContent,
            data: uniqueLines.join('\n'),
            image: dom.window.document.querySelector('.item-info img').src,
            url: searchUrl
        };

        return item;
    }

    async searchItemById(id) {
        const searchUrl = `https://www.takproject.net/allaclone/item.php?id=${id}`;
        const response = await fetch(searchUrl);
        const data = await response.text();

        if (data.includes('item-info')) {
            return this.processItem(data, id, searchUrl);
        }

        return null;
    }

}