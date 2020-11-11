var crypto = require('crypto');
var express = require('express');
var router = express.Router();
// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Set the region
AWS.config.update({ region: process.env.AWS_REGION || 'eu-west-1' });

// Create an S3 object
var s3 = new AWS.S3();

// ARN to OCR Input Bucket
var S3input = process.env.AWS_S3_OCR_INPUT;

// ARN to OCR Output Bucket
var S3output = process.env.AWS_S3_OCR_OUTPUT;

// Multer for file uploads
var multer = require('multer');
var multerS3 = require('multer-s3');

var upload = multer({
  storage: multerS3({
      s3: s3,
      bucket: S3input,
      key: function (req, file, cb) {
          console.log(file);
          cb(null, crypto.randomBytes(8).toString('hex')+'_'+file.originalname); //add random prefix
      }
  })
});

/* GET bucket contents */
router.get('/getBucketContent/:bucket', function (req, res, next) {
  var params = {
    Bucket: '',
  }
  if (req.params.bucket == "input") { params.Bucket = S3input }
  else if (req.params.bucket == "output") { params.Bucket = S3output }
  else { res.status(500); res.send("invalid bucket type"); }

  s3.listObjects(params, function (err, data) {
    if (err) throw err;
    // data.Contents
    /*
    {
      Key: 'test.png',
      LastModified: 2020-11-11T20:29:04.000Z,
      ETag: '"f22b1c733d8a1cdf40d0cae5b270bf3f"',
      Size: 503683,
      StorageClass: 'STANDARD',
      Owner: [Object]
    }
    */
    let result = data.Contents.map(d => {
      return [
        '<a href="/api/file/'+req.params.bucket+'/'+d.Key+'" target="_blank">'+d.Key+'</a>',
        d.LastModified
      ]
    });
    res.json({
      "data": result
    });

  });
});

/* POST file upload to input bucket */
router.post('/upload', upload.single('file'), function (req, res, next) {
  res.send("Uploaded!");
});

/* GET file - redirects user to signed URL */
router.get('/file/:bucket/:key', function(req, res, next){
  var params = {
    Bucket: '',
    Expires: 60,
    Key: req.params.key
  }
  if (req.params.bucket == "input") { params.Bucket = S3input }
  else if (req.params.bucket == "output") { params.Bucket = S3output }
  else { res.status(500); res.send("invalid bucket type"); }
  var url = s3.getSignedUrl('getObject', params);
  res.redirect(url);
});

module.exports = router;
