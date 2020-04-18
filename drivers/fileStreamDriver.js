const mongoose = require("mongoose");
//const Donor = require("../models/donor");
var fs = require("fs");
const Grid = require("gridfs-stream");
//const dataBaseDriver = require("./dataBaseDriver");
const conn = mongoose.connection;
let mongoDriver;
//var mongodb = require("mongodb");
var ObjectId = require("mongodb").ObjectID;

// const EARTH_RADIUS_MILES = 3963.2;

conn.once("open", function () {
  console.log("Mongo connection open!");
  mongoDriver = mongoose.mongo;
  //init Stream
  gfs = Grid(conn.db, mongoDriver);
  gfs.collection("fs");
});

module.exports = {
  upload: async function (file, _callback) {
    const gridFSBucket = new mongoDriver.GridFSBucket(conn.db);
    const writeStream = gridFSBucket.openUploadStream(file.name);

    var filePath = file.path;

    fs.createReadStream(filePath).pipe(writeStream);

    writeStream.on("finish", function (res_upload) {
      //query data and add to matching manufactuers
      console.log("Uploaded");
      console.log("file id:" + res_upload._id);
      console.log(res_upload);
      // console.log(file);
      fs.unlink(filePath, function (err) {
        if (err) throw err;
        console.log("success!");
        var uploadRes = {
          name: file.name,
          size: res_upload.length,
          id: res_upload._id,
        };
        _callback(uploadRes);
        return true;
      });
    });

    writeStream.on("error", function (error) {
      console.log(error);
      return false;
    });
  },
  /////////////////////////////// DOWNLOAD UPLOADED FILE ///////////////////////
  download: function (file_id, res, _callback) {
    const gridFSBucket = new mongoDriver.GridFSBucket(conn.db);
    //console.log(`file id from download: ${file_id}`);
    var downloadStream = gridFSBucket.openDownloadStream(ObjectId(file_id));
    // console.log("Res");
    // console.log(res);
    downloadStream
      .pipe(res)
      .on("finish", function () {
        console.log("Successful download");
        //return true;
        _callback(true); //call back is only for testing
      })
      .on("error", function (error) {
        console.log("Error downloading stl file :(");
        console.log(error);
        _callback(false);
        //return false;
      });
  },
  //////////////// UPLOAD GENERATED PDF /////////////////////////////
  // uploadPDF: async function (file, _callback) {
  //   const gridFSBucket = new mongoDriver.GridFSBucket(conn.db);
  //   const writeStream = gridFSBucket.openUploadStream(file.name);

  //   var filePath = file.path;

  //   fs.createReadStream(filePath).pipe(writeStream);

  //   writeStream.on("finish", function (res_upload) {
  //     //query data and add to matching manufactuers
  //     console.log("Uploaded");
  //     console.log("file id:" + res_upload._id);
  //     // console.log(file);
  //     fs.unlink(filePath, function (err) {
  //       if (err) throw err;
  //       console.log("success!");
  //       var uploadRes = {
  //         name: file.name,
  //         size: file.size,
  //         id: res_upload._id,
  //       };
  //       _callback(uploadRes);
  //       return true;
  //     });
  //   });

  //   writeStream.on("error", function (error) {
  //     console.log(error);
  //     return false;
  //   });
  // },
};
