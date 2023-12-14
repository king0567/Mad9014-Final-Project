
import {FaceDetector, FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

document.getElementById('search').addEventListener('click', openSearch);
document.getElementById('saved').addEventListener('click', openSaved);
document.getElementById('saved').addEventListener('click', openSavedHeading);
document.getElementById('runSearch').addEventListener('click', doSearch);
document.getElementById('cancel').addEventListener('click', doCancel);


let searchDialogBox = document.getElementById('searchDialog');
let inputField = document.getElementById('searchTerm');
let resultOutput = document.getElementById('results')
let textOutput = document.getElementById('textResults');
let dlButton = document.getElementById('dlButton');

let faceDetector;
let runningMode = "IMAGE";
let detections;

async function initializeFaceDetector() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceDetector = await FaceDetector.createFromOptions(
        vision,
        {
            baseOptions: {
            modelAssetPath: "./app/shared/models/blaze_face_short_range.tflite"
            },
            scoreThreshold: 0.3,
            runningMode: runningMode
        });
}
initializeFaceDetector();

inputField.addEventListener('keydown', (event)=>{
    if (event.key === 'Enter'){
        doSearch();
        searchDialogBox.close();
    }
})

function openSearch(){
    searchDialogBox.showModal();
}

function doCancel(){
    inputField.value = '';
    searchDialogBox.close();
}

function doSearch(){
    searchDialogBox.close();
    doFetch(inputField.value);
}

function doFetch(inputFieldValue){
    fetch(`https://pixabay.com/api/?key=41019867-9ddff7c508c8cf9a83844d644&q=${inputFieldValue}&image_type=photo&orientation=horizontal&category=people&per_page=30`)
    .then(response => {
        if(!response.ok){
            throw new Error(response.status)
        }
        return response.json();
    })
    .then(data => {
        handleResults(data.hits)
    })
    .catch(err => {
        alert(`${err} unable to search images`);
    })
}

function handleResults(photosObj){
    resultOutput.innerHTML = '';
    textOutput.innerHTML = '';

    if(photosObj.length === 0){
        textOutput.innerHTML = `<h2 class="text-results">No results for ${inputField.value}</h2>`;
        inputField.value = '';
        return;
    }else{
        textOutput.innerHTML = `<h2 class="text-results">Results for ${inputField.value} :</h2>`;
        photosObj.forEach(photo =>{
            let imageURL = photo.largeImageURL
            let {imageContainer, image} = createImageElement();
            image.setAttribute('src', imageURL)
            image.setAttribute('alt', inputField.value)
            imageContainer.appendChild(image)
            imageContainer.addEventListener('click', function(){
                resultsImagePopUp(imageURL, image.alt);
            });
            resultOutput.appendChild(imageContainer);
            inputField.value = '';
            searchDialogBox.close();
        })
    }
}

function createImageElement(){
    let image = document.createElement('img');
    image.setAttribute('class', 'image');

    let imageContainer = document.createElement('div')
    imageContainer.setAttribute('class', 'imgDiv')

    return {imageContainer, image};
}

function resultsImagePopUp(imageURL, alt){
    let resultsDialogBox = createImagePopUp();
    document.body.appendChild(resultsDialogBox);

    let resultsBigImage = document.createElement('img');
    resultsBigImage.setAttribute('src', imageURL);
    resultsBigImage.setAttribute('alt', alt);
    resultsBigImage.setAttribute('class', 'big-image');
    resultsBigImage.addEventListener('load', ()=>{
        resultsDialogBox.showModal();
    })

    let closeButton = document.createElement('button');
    closeButton.setAttribute('class', 'btn');
    closeButton.textContent = 'Close'
    closeButton.addEventListener('click', ()=>{
        console.log(resultsDialogBox)
        resultsDialogBox.close();
        resultsDialogBox.parentNode.removeChild(resultsDialogBox);
        saveButton.removeEventListener('click', doSave);
    });

    let saveButton = document.createElement('button');
    saveButton.setAttribute('class', 'btn');
    saveButton.textContent = 'Save'
    saveButton.addEventListener('click', ()=>{
        doSave(imageURL, resultsDialogBox);
    });

    let buttonDiv = document.createElement('div');
    buttonDiv.setAttribute('class', 'btn-div');
    buttonDiv.appendChild(closeButton);
    buttonDiv.appendChild(saveButton);


    resultsDialogBox.appendChild(resultsBigImage);
    resultsDialogBox.appendChild(buttonDiv);
}

function createImagePopUp(){
    let newDialogBox = document.createElement('dialog');
    newDialogBox.setAttribute('class', 'dialog-box');
    return newDialogBox;
}

function doSave(imageURL, resultsDialogBox){
    caches
    .open('Picture-This-Saved-Images')
    .then(async(cache)=>{
        await cache.add(imageURL);
    });
    resultsDialogBox.parentNode.removeChild(resultsDialogBox);
    resultsDialogBox.close();
    
}


function openSavedHeading(){
    resultOutput.innerHTML = '';
    textOutput.innerHTML = '<div class="text-results__text"><h1 class="text-results">Saved Pictures</h1><h3 class="text-results">Click on an image to find the faces within it!</h3></div>';
    let selectField = document.createElement('select');
    selectField.setAttribute('class', 'select-field');
    selectField.setAttribute('id', 'select-field');
    selectField.innerHTML = '<option value="newest">newest first</option><option value="oldest">oldest first</option>';
    textOutput.appendChild(selectField)
    selectField.addEventListener('change', ()=>{
        openSaved(selectField);
    })
}



function openSaved(selectField){
    resultOutput.innerHTML = '';
    caches.open('Picture-This-Saved-Images')
    .then(async(cache)=>{
        cache.keys().then((keys)=>{
            keys.reverse();
            if(selectField.value === 'oldest'){
                keys.reverse();
            }
            keys.forEach((instance)=>{
                let {imageContainer, image} = createImageElement();
                let deleteButton = document.createElement('button');
                deleteButton.setAttribute('class', 'trashBin');
                deleteButton.innerHTML = `<i class="fa fa-trash-o"></i>`;
                deleteButton.addEventListener('click', ()=>{
                    imageContainer.parentNode.removeChild(imageContainer);
                    caches.open('Picture-This-Saved-Images')
                    .then(async(cache)=>{
                        await cache.delete(instance);
                    });
                })
                image.setAttribute('src', instance.url)
                
                image.addEventListener('click', function(){
                    savedImagePopUp(instance, imageContainer);
                });
                imageContainer.appendChild(image)
                imageContainer.appendChild(deleteButton)

                resultOutput.appendChild(imageContainer);
            })
        })
    })
}

function savedImagePopUp(instance, imageContainer){
    
    fetch(instance.url)
    .then(response =>{
        if(!response.ok){
            throw new Error(response.status)
        }
        return response.blob();
    })
    .then(imageBlob =>{
        let newURL = URL.createObjectURL(imageBlob);
        createSavedImagePopUp(newURL, imageContainer)
    })
    .catch(err=>{
        alert(err)
    })

    function createSavedImagePopUp(newURL, imageContainer){
        let savedImageDialogBox = createImagePopUp();
        document.body.appendChild(savedImageDialogBox);
        console.log(instance)
        let savedBigImage = document.createElement('img');
        savedBigImage.setAttribute('src', newURL);
        savedBigImage.setAttribute('class', 'big-image');
        console.log(savedBigImage)
        savedBigImage.addEventListener('load', ()=>{
            savedImageDialogBox.showModal();
        });
        savedBigImage.addEventListener('load', (event)=>{
            doFaceScan(event, savedImageDialogBox)
        });
    
        let closeButton = document.createElement('button');
        closeButton.setAttribute('class', 'btn');
        closeButton.textContent = 'Close'
        closeButton.addEventListener('click', ()=>{
            savedImageDialogBox.close();
            savedImageDialogBox.parentNode.removeChild(savedImageDialogBox);
        });
    
        let deleteButton = document.createElement('button');
        deleteButton.setAttribute('class', 'btn');
        deleteButton.textContent = 'Delete'
        deleteButton.addEventListener('click', ()=>{
            doDelete(instance, savedImageDialogBox, imageContainer);
        });
    
        let buttonDiv = document.createElement('div');
        buttonDiv.setAttribute('class', 'btn-div');
        buttonDiv.appendChild(closeButton);
        buttonDiv.appendChild(deleteButton);
    
        savedImageDialogBox.appendChild(savedBigImage);
        savedImageDialogBox.appendChild(buttonDiv);
    }


}

function doDelete(instance, dialogBox, imageContainer){
    dialogBox.close();
    imageContainer.parentNode.removeChild(imageContainer);
    console.log(instance)

    caches.open('Picture-This-Saved-Images')
    .then(async(cache)=>{
        await cache.delete(instance);
    });
    dialogBox.parentNode.removeChild(dialogBox);
}

async function doFaceScan(event, dialogBox){
    if(!faceDetector){
        alert('Face-Detector still loading. Please wait and try again.');
        return;
    };

    detections = await faceDetector.detect(event.target);

    if(detections.detections.length === 0){
        let noDetectionMessage = document.createElement('p');
        noDetectionMessage.setAttribute('class', 'no-detection-message')
        noDetectionMessage.innerText = 'No faces were detected'
        dialogBox.appendChild(noDetectionMessage);
        return;
    };

    displayImageDetections(detections, event.target);
}

function displayImageDetections(result, resultElement){

    let ratio = resultElement.height / resultElement.naturalHeight;

    console.log(result)

    result.detections.forEach(detection =>{
        
        let detectionBox = document.createElement('div');
        detectionBox.setAttribute('class', 'detection-box');
        detectionBox.style = 
        "left: " +
        detection.boundingBox.originX * ratio +
        "px;" +
        "top: " +
        detection.boundingBox.originY * ratio +
        "px;" +
        "width: " +
        (detection.boundingBox.width * ratio + 20) +
        "px;" +
        "height: " +
        (detection.boundingBox.height * ratio + 20) +
        "px;";

        let detectionInfo = document.createElement('div');
        detectionInfo.setAttribute('class', 'info');
        detectionInfo.innerText = 'Face - ' + Math.round(parseFloat(detection.categories[0].score) * 100) + '%';
        
        detectionInfo.style = 
        "left: " +
        "-70px;" + 
        "top: " +
        "-2px;";

        detectionBox.appendChild(detectionInfo);
        resultElement.parentNode.appendChild(detectionBox);

        detection.keypoints.forEach(point =>{
            console.log(point)
            let keyPoint = document.createElement('p');
            keyPoint.setAttribute('class', 'key-points');
            keyPoint.style = 
            "top:" + (point.y * resultElement.height) + "px;" +
            "left:" + (point.x * resultElement.width) + "px;"

            console.log(point.y * resultElement.height)
            console.log(point.y)
            resultElement.parentNode.appendChild(keyPoint);
        });
    })
};

dlButton.addEventListener('click', darkLightToggle);

function darkLightToggle() {
    if(!localStorage.getItem('theme')){
        localStorage.setItem('theme', 'dark-mode');
        applyDarkMode();
        return;
    }else if(dlButton.style.justifyContent === 'flex-start'){
        localStorage.setItem('theme', 'dark-mode');
        applyDarkMode();
    }else if(dlButton.style.justifyContent === 'flex-end') {
        localStorage.setItem('theme', 'light-mode');
        applyLightMode();
    }
}

getTheme();

function getTheme(){
    if(localStorage.getItem('theme') === 'light-mode'){
        console.log('light')
        applyLightMode();
    }else if (localStorage.getItem('theme') === 'dark-mode'){
        console.log('dark')
        applyDarkMode();
    }
};

function applyDarkMode(){
    dlButton.style.justifyContent = 'flex-end';
    document.body.classList.toggle('dark-mode');
    document.getElementById('search').classList.toggle('btn-dark-mode');
    document.getElementById('saved').classList.toggle('btn-dark-mode');
    document.getElementById('dlSlider').classList.toggle('dl-slider-dark-mode');
    document.getElementById('sunMoonIcon').setAttribute('class', 'gg-sun');
};

function applyLightMode() {
    dlButton.style.justifyContent = 'flex-start';
    document.body.classList.remove('dark-mode');
    document.getElementById('search').classList.remove('btn-dark-mode');
    document.getElementById('saved').classList.remove('btn-dark-mode');
    document.getElementById('dlSlider').classList.remove('dl-slider-dark-mode');
    document.getElementById('sunMoonIcon').setAttribute('class', 'fa fa-moon-o');
};