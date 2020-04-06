// function to find the distance between two location based on latitute and longitue

function euclidist(locA, locB) {
    let longA = locA.longitude
    let latA = locA.latitude
    let longB = locB.longitude
    let latB = locB.latitude

    return Math.sqrt((longB - longA) * (longB - longA) + (latB - latA) * (latB - latA));

}


module.exports = {
    euclidist
}