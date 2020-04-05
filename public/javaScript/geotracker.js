// client side geo tracker

// DOMContentLoaded for loading the script once the browser is ready
document.addEventListener('DOMContentLoaded', () => {

  
        // get latitude and longitude of the donor
        let long = document.getElementById('longitude')
        let lat = document.getElementById('latitude')
    
        setInterval(() => {
    
            // console.log('tick');
    
            navigator.geolocation.getCurrentPosition(
                (position) => {
    
                    let {
                        latitude,
                        longitude,
                        accuracy
                    } = position.coords
    
                    // console.log('Your current position is:');
                    // console.log(`Latitude : ${latitude } deg`);
                    // console.log(`Longitude: ${longitude } deg`);
                    // console.log(`Accuracy: ${accuracy} m`);
    
                    // console.log('Input DOM element long %j', long.value)
                    // console.log('Input DOM element lat %j', lat.value)

                    long.value = longitude
                    lat.value = latitude
    
                    console.log('Input DOM element long %j', long.value)
                    console.log('Input DOM element lat %j', lat.value)
                    // socket.emit('locationUpdate', {
                    //     latitude,
                    //     longitude,
                    //     accuracy
                    // })
                },
                (error) => {
                    console.warn(`ERROR(${error.code}): ${error.message}`);
                }, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    // maximumAge: 5000
                    maximumAge: 0
                }
            )
        }, 5000) // 2000 ms interval

    
    // // const socket = io('/')

    // // emitting ping to server
    // // socket.emit('_ping')
    // // socket.on('_pong', () => {
    // //     console.log('got pong')
    // // })

    // setInterval(() => {

    //     // console.log('tick');

    //     navigator.geolocation.getCurrentPosition(
    //         (position) => {

    //             let {
    //                 latitude,
    //                 longitude,
    //                 accuracy
    //             } = position.coords

    //             // console.log('Your current position is:');
    //             // console.log(`Latitude : ${latitude } deg`);
    //             // console.log(`Longitude: ${longitude } deg`);
    //             // console.log(`Accuracy: ${accuracy} m`);

    //             // socket.emit('locationUpdate', {
    //             //     latitude,
    //             //     longitude,
    //             //     accuracy
    //             // })
    //         },
    //         (error) => {
    //             console.warn(`ERROR(${error.code}): ${error.message}`);
    //         }, {
    //             enableHighAccuracy: true,
    //             timeout: 5000,
    //             // maximumAge: 5000
    //             maximumAge: 0
    //         }
    //     )
    // }, 5000) // 2000 ms interval
})