const Leech = require("./leech")
const fs = require("fs")
const axios = require("axios")
const { v4: uuidv4 } = require('uuid')

const crawlAll = async () => {
    const crawl = new Leech()
    await crawl.init('https://npcshop.vn/')

    const menu = crawl.getAttr('.box-menu-main .menu-content a.itop', 'href').array()

    for (const item of menu) {
        await crawlAction(item.replaceAll('/', ''), 'https://kccshop.vn' + item )
    }
}


const crawlAction = async (key, link) => {

    const crawl = new Leech()

    await crawl.init(link)

    let links = crawl.getAttr('.p-container .p-img', 'href').array()

    // Link data
    links = links.map((e) => 'https://kccshop.vn' + e)

    const lists = []

    links.forEach((e) => {

        lists.push(
            new Promise(async (resolve, reject) => {

                try {

                    const site = new Leech()
                    await site.init(e)

                    const imageAvatar = 'https://kccshop.vn' + site.getAttr('.MagicZoom img', 'src').single()
                    const arr = imageAvatar.split('.')

                    const fileExtention = arr[arr.length - 1]

                    const res = await axios.get(imageAvatar, { responseType: 'arraybuffer' })

                    console.log('Download: ', imageAvatar)

                    let path = 'public/images'

                    fs.mkdirSync(path, {recursive: true})

                    const fullPath = path + '/images-' + uuidv4() + '.' + fileExtention;

                    await fs.writeFileSync(fullPath, res.data)

                    const data = {
                        name: site.getText('.header-product-detail .product-name').single(),
                        attr: site.getText('.detail-n-sumary .list-n span')
                            .array()
                            .map((txt) => ({
                                key: txt.replace(/:.*$/, '').trim(),
                                value: txt.replace(/^.*:/, '').trim()
                            })),
                        avatar: fullPath,
                        price: site.getText('.detail-n-price .n-num').single().replace(/\s.*$/, ''),
                        oldPrice: site.getText('.detail-n-old-price span').single().replace(/\s.*$/, ''),
                        content: site.getHTML('.content-read').single()
                    }

                    resolve(data)

                } catch (e) {
                    resolve()
                }

            })
        )

    })

    const result = await Promise.all(lists)

    fs.mkdirSync(`${key}`, {recursive: true})

    const resultFilter = result.filter((e) => !!e)

    fs.writeFileSync(`${key}/${key}-${Math.random()}.json`, JSON.stringify(resultFilter), 'utf8')

    const next = crawl.getAttr('.paging a.current + a', 'href').single()

    if(next) {
        await crawlAction(key, 'https://kccshop.vn' + next)
    } else {
        console.log('Done')
    }

}

crawlAll()
