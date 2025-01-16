import { renderFile } from 'ejs';

export function renderTemplate(filePath: string, data: any): Promise<string> {
    return new Promise((resolve, reject) => {
        renderFile(filePath, data, (err, html) => {
            if (err) {
                reject(err);
            } else {
                resolve(html);
            }
        })
    });
}
