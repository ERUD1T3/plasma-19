require("dotenv").config();

var ObjectId = require("mongodb").ObjectID;

const mapboxDatasetId = process.env.MAPBOX_DATASET_ID;

const mbxClient = require("@mapbox/mapbox-sdk");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mbxDatasets = require("@mapbox/mapbox-sdk/services/datasets");

const baseClient = mbxClient({
  accessToken: process.env.MAPBOX_ACCESSTOKEN,
});

const geocodingClient = mbxGeocoding(baseClient);
const datasetsClient = mbxDatasets(baseClient);

module.exports = {
  addDonorToMap: function (newDonor, _callback) {
    var mapbox_id = newDonor._id; //find out why this _id is empty
    console.log("Printer id:", mapbox_id);
    //create a new id if donor does not already have one
    var id = !mapbox_id ? new ObjectId() : mapbox_id;

    geocodingClient
      .forwardGeocode({
        query:
          newDonor.inputAddress +
          " " +
          newDonor.inputAddress2 +
          " " +
          newDonor.city +
          " " +
          newDonor.state +
          " " +
          newDonor.zip,
        limit: 2,
      })
      .send()
      .then(
        (response) => {
          const match = response.body;
          console.log(match);
          //store coordiate array (long, lat) in that order
          newDonor.coordinates = match.features[0].geometry.coordinates;
          console.log(newDonor.coordinates);
          console.log(`Dataset id ${mapboxDatasetId}`);
          console.log("feature id: ", id);
          //putting feature should happen in callback otherwise coordinates variable is undefind in global scope
          //add new  feature to dataset
          datasetsClient
            .putFeature({
              datasetId: mapboxDatasetId,
              featureId: id.toString(), //YOu need to figure out how to gen unique ides for this
              feature: {
                type: "Feature",
                properties: {
                  _id: id,
                  firstname: donor.firstName,
                  lastname: donor.lastName,
                  email: donor.email,
                  password: donor.password1,
                  Blood: `${donor.bloodType} ${donor.Rh}`, // type plus Rh so A+
                  Address: {
                    line1: donor.inputAddress,
                    line2: donor.inputAddress2,
                    city: donor.city,
                    state: donor.state,
                    zip: donor.zip,
                  },
                },
                geometry: {
                  type: "Point",
                  coordinates: newDonor.coordinates,
                },
              },
            })
            .send()
            .then(
              (response) => {
                const feature = response.body;
                console.log(feature);
                console.log("Updated map");
                // _callback(newDonor.coordinates);
                // _callback(newDonor);
                _callback(0, feature);
              },
              (error) => {
                console.log(`Error putting new feature: ${error} `);
                console.log(error);
                throw error;
                _callback(error, {});
              }
            );
        },
        (error) => {
          console.error(error.message);
          throw error;
          _callback(error, {});
          //throw error;
        }
      );
  },
};
