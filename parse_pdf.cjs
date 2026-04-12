const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('d:/User/Desktop/github/Lab_works/sample/fardeen 1-5.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text.substring(0, 2000));
});
