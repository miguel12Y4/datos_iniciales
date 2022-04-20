const FormData = require('form-data');
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const axios = require('axios');

const URL = 'http://0.0.0.0:8000'

const USERNAME = 'admin'
const PASSWORD = '1234'

const MODELO_INICIAL = 'modelo1'
const DATASET_INICIAL = 'dataset1'

const CLASES_INICIALES = [
    {
        nombre: 'Persona',
        codigo:'PERSONA',
        color:'rgba(255, 233, 0, 1)',
        fill:'rgba(255, 233, 0, 0.4)',
        search: 2,
    },
    {
        nombre: 'Camión',
        codigo:'CAMION',
        color:'rgba(120, 40, 140, 1)',
        fill:'rgba(120, 40, 140, 0.4)',
        search: 3,
    },
    {
        nombre: 'Grúa',
        codigo:'GRUA',
        color:'rgba(240, 248, 255, 1)',
        fill:'rgba(240, 248, 255, 0.4)',
        search: 4,
    },
    {
        nombre: 'Pallet',
        codigo:'PALLET',
        color:'rgba(0, 255, 0, 1)',
        fill:'rgba(0, 255, 0, 0.4)',
        search: 5,
    }, 
    {
        nombre: 'Casco',
        codigo:'CASCP',
        color:'rgba(100, 25, 0, 1)',
        fill:'rgba(100, 25, 0, 0.4)',
        search: 6,
    }
]

//login para obtener las credenciales
async function login(username, password) {
    let formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch(URL+'/api/login/', {
            method: 'POST',
			body: formData,
       }
    )

    const data = await response.json();

    return data;
}

//crear primer modelo para mapear las detecciones iniciales
async function crearModelo({fecha, nombre, data, activo, lock, user, actualizacion, datasets}, token) {
    
    const response = await fetch(URL+'/api/modelos/', {
            method: 'POST',
			body: JSON.stringify({fecha, nombre, data, activo, lock, user, actualizacion, datasets}),
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Token "+token
            },
       }
    )

    const datos = await response.json();

    return datos;
}

//crear dataset para el modelo
async function crearDataset({fecha, nombre, data, activo, lock, user, actualizacion}, token) {

    const response = await fetch(URL+'/api/datasets/', {
            method: 'POST',
			body: JSON.stringify({fecha, nombre, data, activo, lock, user, actualizacion}),
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Token "+token
            },
       }
    )

    const datos = await response.json();

    return datos;
}


async function getDatasetByName(name, token){
    const response = await fetch(URL+'/api/datasets',{
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Token "+token
        }
    });
    const data = await response.json();
    
    return data.filter(dataset => dataset.nombre===name)[0];
}

async function getModeloByName(name, token){
    const response = await fetch(URL+'/api/modelos',{
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Token "+token
        },
    });
    const data = await response.json();
    return data.filter(modelo=>modelo.nombre==name)[0];
}

//agregar clases iniciales
async function crearClases(clases, token){

    return Promise.all(
        clases.map(async clase=>{
            const {nombre, codigo, search, color, fill} = clase;
            const response = await fetch(URL+'/api/clases/', {
                method: 'POST',
                body: JSON.stringify({nombre, codigo, search, color, fill}),
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": "Token "+token
                }
            })
            const datos = await response.json();
            return datos;

        })
    )
}

async function getClases(token){
    const response = await fetch(URL+'/api/clases',{
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Token "+token
        },
    });
    const data = await response.json();
    return data;
}

async function uploadDeteccion({modelo, contexto, archivo},token){
    let form = new FormData();
    form.append('modelo', modelo);
    form.append('contexto', contexto);
    const file = fs.readFileSync(archivo);
    form.append('archivo', file, 'data.zip');

    const response = await fetch(
        URL+'/api/detecciones/upload',
        {
        method: 'POST',
        body: form,
        headers:{
            Authorization: 'Token '+token
        }
    })
   const data = await response.json();
   return data
}

//agregar detecciones por cada cámara

(async ()=>{
    const {id, token} = await login('admin', '1234');

    let clases = await getClases(token);
    
    if(clases.length === 0){
        clases = await crearClases(CLASES_INICIALES, token)
        console.log("clases iniciales creadas")
        }else{
            console.log("clases ya existen, obteniendo informacion de las clases existentes")
    }
    
    let dataset = await crearDataset({
        fecha: '2022-04-19T11:09:04.724051-04:00',
        nombre: DATASET_INICIAL,
        data: {"":""},
        activo: true,
        lock: false,
        user: URL+'/api/users/'+id+'/',
        actualizacion: '2022-04-19T11:09:04.724051-04:00',

    }, token)

    if(dataset?.id===undefined) {
        console.log("dataset ya existe, obteniendo informacion del dataset existente")
        dataset = await getDatasetByName(DATASET_INICIAL, token)
    }else{
        console.log("dataset inicial creado")
    }

    let modelo = await crearModelo({
        fecha: '2022-04-19T11:09:04.724051-04:00',
        nombre: MODELO_INICIAL,
        data: {"clases":clases.map(({codigo})=>codigo)},
        activo: true,
        lock: false,
        user: URL+'/api/users/'+id+'/',
        actualizacion: '2022-04-19T11:09:04.724051-04:00',
        datasets: [URL+'/api/datasets/'+dataset.id+'/'],

    }, token)

    
    if(modelo?.id===undefined) {
        console.log("modelo ya existe, obteniendo informacion del modelo existente")
        modelo = await getModeloByName(MODELO_INICIAL, token)
    }else{
        console.log("modelo inicial creado")
    }

    const data = await uploadDeteccion({
        modelo: modelo.nombre,
        contexto: "nuevaaldea_bpt",
        archivo: "./archivos/data.zip"
    }, token)
    console.log(data.zip && "detecciones cargadas correctamente")
})()