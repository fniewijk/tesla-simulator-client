if (!Detector.webgl) Detector.addGetWebGLMessage();

var FOLLOW_CAMERA = false;

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

var SHADOW_MAP_WIDTH = 1024,
    SHADOW_MAP_HEIGHT = 1024;

var container, stats;

var camera, cameraTarget, scene, renderer;
var renderTarget;

var spotLight, ambientLight;

var cubeCamera;

var clock = new THREE.Clock();

var controlsGallardo = {

    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false

};

var controlsVeyron = {

    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false

};

var mlib;

var gallardo, veyron, currentCar;

var effectDirt, hblur, vblur, effectBloom, effectKeep, effectBlend, effectFXAA;

var config = {
    "veyron": { r: 0.5, model: null, backCam: new THREE.Vector3(550, 100, -1000) },
    "gallardo": { r: 0.35, model: null, backCam: new THREE.Vector3(550, 0, -1500) }
};

var flareA, flareB;
var sprites = [];

var ground, groundBasic;

var blur = false;

var v = 0.9,
    vdir = 1;

init();
animate();

function init() {
    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(18, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 100000);
    camera.position.set(3000, 0, 3000);

    cameraTarget = new THREE.Vector3();

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 3000, 10000);
    scene.fog.color.setHSL(0.51, 0.6, 0.6);

    createScene();

    // LIGHTS

    ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);

    spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2, 1);
    spotLight.position.set(0, 1800, 1500);
    spotLight.target.position.set(0, 0, 0);
    spotLight.castShadow = true;

    spotLight.shadowCameraNear = 100;
    spotLight.shadowCameraFar = camera.far;
    spotLight.shadowCameraFov = 50;

    spotLight.shadowBias = -0.00125;
    spotLight.shadowMapWidth = SHADOW_MAP_WIDTH;
    spotLight.shadowMapHeight = SHADOW_MAP_HEIGHT;

    scene.add(spotLight);

    directionalLight2 = new THREE.PointLight(0xff9900, 0.25);
    directionalLight2.position.set(0.5, -1, 0.5);
    //directionalLight2.position.normalize();
    //scene.add( directionalLight2 );

    // RENDERER

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setClearColor(scene.fog.color);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container.appendChild(renderer.domElement);

    // SHADOW

    renderer.shadowMap.cullFace = THREE.CullFaceBack;
    renderer.shadowMap.enabled = true;

    // STATS

    stats = new Stats();
    container.appendChild(stats.domElement);

    // CUBE CAMERA

    cubeCamera = new THREE.CubeCamera(1, 100000, 128);
    scene.add(cubeCamera);

    // MATERIALS

    var cubeTarget = cubeCamera.renderTarget;

    mlib = {

        body: [],

        "Chrome": new THREE.MeshLambertMaterial({ color: 0xffffff, envMap: cubeTarget }),

        "Dark chrome": new THREE.MeshLambertMaterial({ color: 0x444444, envMap: cubeTarget }),

        "Black rough": new THREE.MeshLambertMaterial({ color: 0x050505, }),

        "Dark glass": new THREE.MeshLambertMaterial({ color: 0x101020, envMap: cubeTarget, opacity: 0.5, transparent: true }),
        "Orange glass": new THREE.MeshLambertMaterial({ color: 0xffbb00, opacity: 0.5, transparent: true }),
        "Red glass": new THREE.MeshLambertMaterial({ color: 0xff0000, opacity: 0.5, transparent: true }),

        "Black metal": new THREE.MeshLambertMaterial({ color: 0x222222, envMap: cubeTarget, combine: THREE.MultiplyOperation }),
        "Orange metal": new THREE.MeshLambertMaterial({ color: 0xff6600, envMap: cubeTarget, combine: THREE.MultiplyOperation })

    };

    mlib.body.push(["Orange", new THREE.MeshLambertMaterial({ color: 0x883300, envMap: cubeTarget, combine: THREE.MixOperation, reflectivity: 0.1 })]);
    mlib.body.push(["Blue", new THREE.MeshLambertMaterial({ color: 0x113355, envMap: cubeTarget, combine: THREE.MixOperation, reflectivity: 0.1 })]);
    mlib.body.push(["Red", new THREE.MeshLambertMaterial({ color: 0x660000, envMap: cubeTarget, combine: THREE.MixOperation, reflectivity: 0.1 })]);
    mlib.body.push(["Black", new THREE.MeshLambertMaterial({ color: 0x000000, envMap: cubeTarget, combine: THREE.MixOperation, reflectivity: 0.2 })]);
    mlib.body.push(["White", new THREE.MeshLambertMaterial({ color: 0xffffff, envMap: cubeTarget, combine: THREE.MixOperation, reflectivity: 0.2 })]);

    mlib.body.push(["Carmine", new THREE.MeshPhongMaterial({ color: 0x770000, specular: 0xffaaaa, envMap: cubeTarget, combine: THREE.MultiplyOperation })]);
    mlib.body.push(["Gold", new THREE.MeshPhongMaterial({ color: 0xaa9944, specular: 0xbbaa99, shininess: 50, envMap: cubeTarget, combine: THREE.MultiplyOperation })]);
    mlib.body.push(["Bronze", new THREE.MeshPhongMaterial({ color: 0x150505, specular: 0xee6600, shininess: 10, envMap: cubeTarget, combine: THREE.MixOperation, reflectivity: 0.2 })]);
    mlib.body.push(["Chrome", new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, envMap: cubeTarget, combine: THREE.MultiplyOperation })]);

    // FLARES
    var textureLoader = new THREE.TextureLoader();

    flareA = textureLoader.load("3d/car/textures/lensflare2.jpg");
    flareB = textureLoader.load("3d/car/textures/lensflare0.png");

    // CARS - VEYRON

    veyron = new THREE.Car();

    veyron.modelScale = 3;
    veyron.backWheelOffset = 2;

    veyron.callback = function(object) {

        addCar(object, -300, -215, 0, 0);
        setMaterialsVeyron(object);

        var sa = 2,
            sb = 5;

        var params = {

            "a": { map: flareA, color: 0xffffff, blending: THREE.AdditiveBlending },
            "b": { map: flareB, color: 0xffffff, blending: THREE.AdditiveBlending },

            "ar": { map: flareA, color: 0xff0000, blending: THREE.AdditiveBlending },
            "br": { map: flareB, color: 0xff0000, blending: THREE.AdditiveBlending }

        };

        var flares = [
            // front
            ["a", sa, [47, 38, 120]],
            ["a", sa, [40, 38, 120]],
            ["a", sa, [32, 38, 122]],
            ["b", sb, [47, 38, 120]],
            ["b", sb, [40, 38, 120]],
            ["b", sb, [32, 38, 122]],
            ["a", sa, [-47, 38, 120]],
            ["a", sa, [-40, 38, 120]],
            ["a", sa, [-32, 38, 122]],
            ["b", sb, [-47, 38, 120]],
            ["b", sb, [-40, 38, 120]],
            ["b", sb, [-32, 38, 122]],
            // back
            ["ar", sa, [22, 50, -123]],
            ["ar", sa, [32, 49, -123]],
            ["br", sb, [22, 50, -123]],
            ["br", sb, [32, 49, -123]],
            ["ar", sa, [-22, 50, -123]],
            ["ar", sa, [-32, 49, -123]],
            ["br", sb, [-22, 50, -123]],
            ["br", sb, [-32, 49, -123]],
        ];

        for (var i = 0; i < flares.length; i++) {

            var p = params[flares[i][0]];

            var s = flares[i][1];

            var x = flares[i][2][0];
            var y = flares[i][2][1];
            var z = flares[i][2][2];

            var material = new THREE.SpriteMaterial(p);
            var sprite = new THREE.Sprite(material);

            var spriteWidth = 128;
            var spriteHeight = 128;

            sprite.scale.set(s * spriteWidth, s * spriteHeight, s);
            sprite.position.set(x, y, z);

            object.bodyMesh.add(sprite);

            sprites.push(sprite);

        }

    };

    veyron.loadPartsBinary("3d/car/obj/veyron/parts/veyron_body_bin.js", "3d/car/obj/veyron/parts/veyron_wheel_bin.js");

    // CARS - GALLARDO

    gallardo = new THREE.Car();

    gallardo.modelScale = 2;
    gallardo.backWheelOffset = 45;

    gallardo.callback = function(object) {

        addCar(object, 300, -110, 0, -110);
        setMaterialsGallardo(object);

        var sa = 2,
            sb = 5;

        var params = {

            "a": { map: flareA, useScreenCoordinates: false, color: 0xffffff, blending: THREE.AdditiveBlending },
            "b": { map: flareB, useScreenCoordinates: false, color: 0xffffff, blending: THREE.AdditiveBlending },

            "ar": { map: flareA, useScreenCoordinates: false, color: 0xff0000, blending: THREE.AdditiveBlending },
            "br": { map: flareB, useScreenCoordinates: false, color: 0xff0000, blending: THREE.AdditiveBlending }

        };

        var flares = [
            // front
            ["a", sa, [70, 10, 160]],
            ["a", sa, [66, -1, 175]],
            ["a", sa, [66, -1, 165]],
            ["b", sb, [70, 10, 160]],
            ["b", sb, [66, -1, 175]],
            ["b", sb, [66, -1, 165]],
            ["a", sa, [-70, 10, 160]],
            ["a", sa, [-66, -1, 175]],
            ["a", sa, [-66, -1, 165]],
            ["b", sb, [-70, 10, 160]],
            ["b", sb, [-66, -1, 175]],
            ["b", sb, [-66, -1, 165]],
            // back
            ["ar", sa, [61, 19, -185]],
            ["ar", sa, [55, 19, -185]],
            ["br", sb, [61, 19, -185]],
            ["br", sb, [55, 19, -185]],
            ["ar", sa, [-61, 19, -185]],
            ["ar", sa, [-55, 19, -185]],
            ["br", sb, [-61, 19, -185]],
            ["br", sb, [-55, 19, -185]],
        ];


        for (var i = 0; i < flares.length; i++) {

            var p = params[flares[i][0]];

            var s = flares[i][1];

            var x = flares[i][2][0];
            var y = flares[i][2][1];
            var z = flares[i][2][2];

            var material = new THREE.SpriteMaterial(p);
            var sprite = new THREE.Sprite(material);

            var spriteWidth = 128;
            var spriteHeight = 128;

            sprite.scale.set(s * spriteWidth, s * spriteHeight, s);
            sprite.position.set(x, y, z);

            object.bodyMesh.add(sprite);

            sprites.push(sprite);

        }

    };

    gallardo.loadPartsBinary("3d/car/obj/gallardo/parts/gallardo_body_bin.js", "3d/car/obj/gallardo/parts/gallardo_wheel_bin.js");

    //

    config["gallardo"].model = gallardo;
    config["veyron"].model = veyron;

    currentCar = gallardo;

    // EVENTS

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    window.addEventListener('resize', onWindowResize, false);

    // POSTPROCESSING

    renderer.autoClear = false;

    var renderTargetParameters = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBFormat,
        stencilBuffer: false
    };
    renderTarget = new THREE.WebGLRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters);

    effectSave = new THREE.SavePass(new THREE.WebGLRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters));

    effectBlend = new THREE.ShaderPass(THREE.BlendShader, "tDiffuse1");

    effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    var effectVignette = new THREE.ShaderPass(THREE.VignetteShader);
    var effectBleach = new THREE.ShaderPass(THREE.BleachBypassShader);
    effectBloom = new THREE.BloomPass(0.75);

    effectFXAA.uniforms['resolution'].value.set(1 / SCREEN_WIDTH, 1 / SCREEN_HEIGHT);

    // tilt shift

    hblur = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader);
    vblur = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);

    var bluriness = 7;

    hblur.uniforms['h'].value = bluriness / SCREEN_WIDTH;
    vblur.uniforms['v'].value = bluriness / SCREEN_HEIGHT;

    if (FOLLOW_CAMERA) {

        if (currentCar == gallardo) {

            hblur.uniforms['r'].value = vblur.uniforms['r'].value = rMap["gallardo"];

        } else if (currentCar == veyron) {

            hblur.uniforms['r'].value = vblur.uniforms['r'].value = rMap["veyron"];

        }

    } else {

        hblur.uniforms['r'].value = vblur.uniforms['r'].value = 0.35;

    }

    effectVignette.uniforms["offset"].value = 1.05;
    effectVignette.uniforms["darkness"].value = 1.5;

    // motion blur

    effectBlend.uniforms['tDiffuse2'].value = effectSave.renderTarget;
    effectBlend.uniforms['mixRatio'].value = 0.65;

    var renderModel = new THREE.RenderPass(scene, camera);

    effectVignette.renderToScreen = true;

    composer = new THREE.EffectComposer(renderer, renderTarget);

    composer.addPass(renderModel);

    composer.addPass(effectFXAA);

    composer.addPass(effectBlend);
    composer.addPass(effectSave);

    composer.addPass(effectBloom);
    composer.addPass(effectBleach);

    composer.addPass(hblur);
    composer.addPass(vblur);

    composer.addPass(effectVignette);

}

//

function setSpritesOpacity(opacity) {

    for (var i = 0; i < sprites.length; i++) {

        sprites[i].material.opacity = opacity;

    }

}

//


function createScene() {

    // GROUND

    var texture = new THREE.TextureLoader().load("3d/car/textures/cube/Park3Med/ny.jpg");
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);

    groundBasic = new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture });
    groundBasic.color.setHSL(0.1, 0.9, 0.7);

    ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(50000, 50000), groundBasic);
    ground.position.y = -215;
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    ground.castShadow = false;
    ground.receiveShadow = true;

    // OBJECTS

    var cylinderGeometry = new THREE.CylinderGeometry(2, 50, 1000, 32);
    var sphereGeometry = new THREE.SphereGeometry(100, 32, 16);

    var sy1 = -500 + 38;
    var sy2 = -88;

    addObject(cylinderGeometry, 0xff0000, 1500, 250, 0, sy1);
    addObject(cylinderGeometry, 0xffaa00, -1500, 250, 0, sy1);
    addObject(cylinderGeometry, 0x00ff00, 0, 250, 1500, sy1);
    addObject(cylinderGeometry, 0x00ffaa, 0, 250, -1500, sy1);

    addObject(sphereGeometry, 0xff0000, 1500, -125, 200, sy2);
    addObject(sphereGeometry, 0xffaa00, -1500, -125, 200, sy2);
    addObject(sphereGeometry, 0x00ff00, 200, -125, 1500, sy2);
    addObject(sphereGeometry, 0x00ffaa, 200, -125, -1500, sy2);

}

//

var canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;

var context = canvas.getContext('2d');
var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
gradient.addColorStop(0.1, 'rgba(0,0,0,1)');
gradient.addColorStop(1, 'rgba(0,0,0,0)');

context.fillStyle = gradient;
context.fillRect(0, 0, canvas.width, canvas.height);

//

var shadowTexture = new THREE.CanvasTexture(canvas);

var shadowPlane = new THREE.PlaneBufferGeometry(400, 400);
var shadowMaterial = new THREE.MeshBasicMaterial({

    opacity: 0.35,
    transparent: true,
    map: shadowTexture,
    polygonOffset: false,
    polygonOffsetFactor: -0.5,
    polygonOffsetUnits: 1

});

function addObject(geometry, color, x, y, z, sy) {

    var object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: color }));
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);

    var shadow = new THREE.Mesh(shadowPlane, shadowMaterial);
    shadow.position.y = sy;
    shadow.rotation.x = -Math.PI / 2;
    object.add(shadow);

}

//

function generateDropShadowTexture(object, width, height, bluriness) {

    var renderTargetParameters = {
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false
    };
    var shadowTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);

    var shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    var shadowGeometry = object.geometry.clone();

    var shadowObject = new THREE.Mesh(shadowGeometry, shadowMaterial);

    var shadowScene = new THREE.Scene();
    shadowScene.add(shadowObject);

    shadowObject.geometry.computeBoundingBox();

    var bb = shadowObject.geometry.boundingBox;

    var dimensions = new THREE.Vector3();
    dimensions.subVectors(bb.max, bb.min);

    var margin = 0.15,

        width = dimensions.z,
        height = dimensions.x,
        depth = dimensions.y,

        left = bb.min.z - margin * width,
        right = bb.max.z + margin * width,

        top = bb.max.x + margin * height,
        bottom = bb.min.x - margin * height,

        near = bb.max.y + margin * depth,
        far = bb.min.y - margin * depth;

    var topCamera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
    topCamera.position.y = bb.max.y;
    topCamera.lookAt(shadowScene.position);

    shadowScene.add(topCamera);

    var renderShadow = new THREE.RenderPass(shadowScene, topCamera);

    var blurShader = THREE.TriangleBlurShader;
    var effectBlurX = new THREE.ShaderPass(blurShader, 'texture');
    var effectBlurY = new THREE.ShaderPass(blurShader, 'texture');

    renderShadow.clearColor = new THREE.Color(0x000000);
    renderShadow.clearAlpha = 0;

    var blurAmountX = bluriness / width;
    var blurAmountY = bluriness / height;

    effectBlurX.uniforms['delta'].value = new THREE.Vector2(blurAmountX, 0);
    effectBlurY.uniforms['delta'].value = new THREE.Vector2(0, blurAmountY);

    var shadowComposer = new THREE.EffectComposer(renderer, shadowTarget);

    shadowComposer.addPass(renderShadow);
    shadowComposer.addPass(effectBlurX);
    shadowComposer.addPass(effectBlurY);

    renderer.clear();
    shadowComposer.render(0.1);

    return shadowTarget;

}

//

function addCar(object, x, y, z, s) {

    object.root.position.set(x, y, z);
    scene.add(object.root);

    object.enableShadows(true);

    if (FOLLOW_CAMERA && object == currentCar) {

        object.root.add(camera);

        camera.position.set(350, 500, 2200);
        //camera.position.set( 0, 3000, -500 );

        cameraTarget.z = 500;
        cameraTarget.y = 150;

        camera.lookAt(cameraTarget);

    }

    var shadowTexture = generateDropShadowTexture(object.bodyMesh, 64, 32, 15);

    object.bodyMesh.geometry.computeBoundingBox();
    var bb = object.bodyMesh.geometry.boundingBox;

    var ss = object.modelScale * 1.1;
    var shadowWidth = ss * (bb.max.z - bb.min.z);
    var shadowHeight = 1.25 * ss * (bb.max.x - bb.min.x);

    var shadowPlane = new THREE.PlaneBufferGeometry(shadowWidth, shadowHeight);
    var shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.5,
        transparent: true,
        map: shadowTexture,
        polygonOffset: false,
        polygonOffsetFactor: -0.5,
        polygonOffsetUnits: 1
    });

    var shadow = new THREE.Mesh(shadowPlane, shadowMaterial);
    shadow.position.y = s + 10;
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = Math.PI / 2;

    object.root.add(shadow);

}

//

function setCurrentCar(car, cameraType) {

    var oldCar = currentCar;

    currentCar = config[car].model;

    if (cameraType == "front" || cameraType == "back") {

        hblur.uniforms['r'].value = vblur.uniforms['r'].value = config[car].r;

        FOLLOW_CAMERA = true;

        oldCar.root.remove(camera);
        currentCar.root.add(camera);

        if (cameraType == "front") {

            camera.position.set(350, 500, 2200);

        } else if (cameraType == "back") {

            camera.position.copy(config[car].backCam);

        }

        cameraTarget.set(0, 150, 500);

    } else {

        FOLLOW_CAMERA = false;

        oldCar.root.remove(camera);

        camera.position.set(2000, 0, 2000);
        cameraTarget.set(0, 0, 0);

        spotLight.position.set(0, 1800, 1500);

        hblur.uniforms['r'].value = vblur.uniforms['r'].value = 0.35;

    }

}

//

function onWindowResize(event) {

    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    composer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    hblur.uniforms['h'].value = 10.75 / SCREEN_WIDTH;
    vblur.uniforms['v'].value = 10.75 / SCREEN_HEIGHT;

    effectFXAA.uniforms['resolution'].value.set(1 / SCREEN_WIDTH, 1 / SCREEN_HEIGHT);

}

//

function onKeyDown(event) {

    switch (event.keyCode) {

        case 38:
            /*up*/ controlsGallardo.moveForward = true;
            break;
        case 87:
            /*W*/ controlsVeyron.moveForward = true;
            break;

        case 40:
            /*down*/ controlsGallardo.moveBackward = true;
            break;
        case 83:
            /*S*/ controlsVeyron.moveBackward = true;
            break;

        case 37:
            /*left*/ controlsGallardo.moveLeft = true;
            break;
        case 65:
            /*A*/ controlsVeyron.moveLeft = true;
            break;

        case 39:
            /*right*/ controlsGallardo.moveRight = true;
            break;
        case 68:
            /*D*/ controlsVeyron.moveRight = true;
            break;

        case 49:
            /*1*/ setCurrentCar("gallardo", "center");
            break;
        case 50:
            /*2*/ setCurrentCar("veyron", "center");
            break;
        case 51:
            /*3*/ setCurrentCar("gallardo", "front");
            break;
        case 52:
            /*4*/ setCurrentCar("veyron", "front");
            break;
        case 53:
            /*5*/ setCurrentCar("gallardo", "back");
            break;
        case 54:
            /*6*/ setCurrentCar("veyron", "back");
            break;

        case 78:
            /*N*/ vdir *= -1;
            break;

        case 66:
            /*B*/ blur = !blur;
            break;

    }

}

function onKeyUp(event) {

    switch (event.keyCode) {

        case 38:
            /*up*/ controlsGallardo.moveForward = false;
            break;
        case 87:
            /*W*/ controlsVeyron.moveForward = false;
            break;

        case 40:
            /*down*/ controlsGallardo.moveBackward = false;
            break;
        case 83:
            /*S*/ controlsVeyron.moveBackward = false;
            break;

        case 37:
            /*left*/ controlsGallardo.moveLeft = false;
            break;
        case 65:
            /*A*/ controlsVeyron.moveLeft = false;
            break;

        case 39:
            /*right*/ controlsGallardo.moveRight = false;
            break;
        case 68:
            /*D*/ controlsVeyron.moveRight = false;
            break;

    }

}


//

function setMaterialsGallardo(car) {

    // BODY

    var materials = car.bodyMaterials;

    materials[0] = mlib.body[0][1]; // body
    materials[1] = mlib["Dark chrome"]; // front under lights, back

    // WHEELS

    materials = car.wheelMaterials;

    materials[0] = mlib["Chrome"]; // insides
    materials[1] = mlib["Black rough"]; // tire

}

function setMaterialsVeyron(car) {

    // 0 - top, front center, back sides
    // 1 - front sides
    // 2 - engine
    // 3 - small chrome things
    // 4 - backlights
    // 5 - back signals
    // 6 - bottom, interior
    // 7 - windshield

    // BODY

    var materials = car.bodyMaterials;

    materials[0] = mlib["Black metal"]; // top, front center, back sides
    materials[1] = mlib["Chrome"]; // front sides
    materials[2] = mlib["Chrome"]; // engine
    materials[3] = mlib["Dark chrome"]; // small chrome things
    materials[4] = mlib["Red glass"]; // backlights
    materials[5] = mlib["Orange glass"]; // back signals
    materials[6] = mlib["Black rough"]; // bottom, interior
    materials[7] = mlib["Dark glass"]; // windshield

    // WHEELS

    materials = car.wheelMaterials;

    materials[0] = mlib["Chrome"]; // insides
    materials[1] = mlib["Black rough"]; // tire

}

//

function animate() {

    requestAnimationFrame(animate);

    render();
    stats.update();

}

function render() {

    var delta = clock.getDelta();

    // day / night

    v = THREE.Math.clamp(v + 0.5 * delta * vdir, 0.1, 0.9);
    scene.fog.color.setHSL(0.51, 0.5, v * 0.75);

    renderer.setClearColor(scene.fog.color);

    var vnorm = (v - 0.05) / (0.9 - 0.05);

    if (vnorm < 0.3) {

        setSpritesOpacity(1 - v / 0.3);

    } else {

        setSpritesOpacity(0);

    }

    if (veyron.loaded) {

        veyron.bodyMaterials[1] = mlib["Chrome"];
        veyron.bodyMaterials[2] = mlib["Chrome"];

        veyron.wheelMaterials[0] = mlib["Chrome"];

    }

    if (gallardo.loaded) {

        gallardo.wheelMaterials[0] = mlib["Chrome"];

    }

    effectBloom.copyUniforms["opacity"].value = THREE.Math.mapLinear(vnorm, 0, 1, 1, 0.75);

    ambientLight.color.setHSL(0, 0, THREE.Math.mapLinear(vnorm, 0, 1, 0.1, 0.3));
    groundBasic.color.setHSL(0.1, 0.5, THREE.Math.mapLinear(vnorm, 0, 1, 0.4, 0.65));

    // blur

    if (blur) {

        effectSave.enabled = true;
        effectBlend.enabled = true;

    } else {

        effectSave.enabled = false;
        effectBlend.enabled = false;

    }

    // update car model

    veyron.updateCarModel(delta, controlsVeyron);
    gallardo.updateCarModel(delta, controlsGallardo);

    // update camera

    if (!FOLLOW_CAMERA) {

        cameraTarget.x = currentCar.root.position.x;
        cameraTarget.z = currentCar.root.position.z;

    } else {

        spotLight.position.x = currentCar.root.position.x - 500;
        spotLight.position.z = currentCar.root.position.z - 500;


    }

    // update shadows

    spotLight.target.position.x = currentCar.root.position.x;
    spotLight.target.position.z = currentCar.root.position.z;

    // render cube map

    var updateCubemap = true;

    if (updateCubemap) {

        veyron.setVisible(false);
        gallardo.setVisible(false);

        cubeCamera.position.copy(currentCar.root.position);

        renderer.autoClear = true;
        cubeCamera.updateCubeMap(renderer, scene);

        veyron.setVisible(true);
        gallardo.setVisible(true);

    }

    // render scene

    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;

    camera.lookAt(cameraTarget);

    renderer.setRenderTarget(null);

    renderer.clear();
    composer.render(0.1);

    renderer.shadowMap.enabled = false;

}
