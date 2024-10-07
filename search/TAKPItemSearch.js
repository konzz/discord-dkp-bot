const jsdom = require('jsdom');
const { JSDOM } = jsdom;

module.exports = class TAKPItemSearch {
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
        const itemStats = dom.window.document.querySelector('.item-stats');
        const itemStatsHtml = itemStats.innerHTML;
        // replace all br tags with newlines
        let itemStatsText = itemStatsHtml.replace(/<br>/g, '\n');
        //replace all closing paragraph tags with newlines
        itemStatsText = itemStatsText.replace(/<p>/g, '\n');
        itemStatsText = itemStatsText.replace(/<\/p>/g, '\n');
        //remove all other html tags
        itemStatsText = itemStatsText.replace(/<[^>]*>/g, '');
        //remove more than 2 newlines
        itemStatsText = itemStatsText.replace(/\n{2,}/g, '\n');

        const item = {
            id: id.toString(),
            name: dom.window.document.querySelector('.item-info > strong').textContent,
            data: itemStatsText,
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