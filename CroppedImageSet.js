class CroppedImageSet {
    constructor(_imageData, _curveJsonData) {
        this.imageData = _imageData;
        this.curveData = _curveJsonData;
    }
}

class CroppedImageContainer {
    constructor() {
        this.croppedImageSets = [];
    }

    clearImageSets() {
        this.croppedImageSets = [];
    }

    async addImage(_imageUrl, _curveJsonUrl) {
        let imageData = await loadImage(_imageUrl);
        let dataResponse = await fetch(_curveJsonUrl);
        let curveJsonData = await dataResponse.json();

        let croppedImageSet = new CroppedImageSet(imageData, curveJsonData);
        this.croppedImageSets.push(croppedImageSet);
    }

    getRandomCroppedImageSet() {
        if (this.croppedImageSets.length === 0) {
            return null;
        }
        
        let randomIndex = int(random(0, this.croppedImageSets.length));
        return this.croppedImageSets[randomIndex];
    }
}