const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const dataPath = path.join(__dirname, 'restaurants.json');

// Aumentar el límite del tamaño de las solicitudes a 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Servir index.html en la raíz
app.get('/', (req, res) => {
    res.sendFile(path.resolve('index.html'));
});

// Obtener todos los restaurantes
app.get('/api/restaurants', (req, res) => {
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error al leer los datos');
        res.json(JSON.parse(data));
    });
});

// Eliminar un producto del menú
app.delete('/api/restaurants/:restaurantIndex/menu/:itemIndex', (req, res) => {
    const { restaurantIndex, itemIndex } = req.params;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error al leer los datos');

        let restaurants = JSON.parse(data);

        if (restaurants[restaurantIndex] && restaurants[restaurantIndex].menu[itemIndex]) {
            restaurants[restaurantIndex].menu.splice(itemIndex, 1);

            fs.writeFile(dataPath, JSON.stringify(restaurants, null, 2), err => {
                if (err) return res.status(500).send('Error al guardar los cambios');
                res.send('Producto eliminado correctamente');
            });
        } else {
            res.status(404).send('Restaurante o producto no encontrado');
        }
    });
});

// Agregar un nuevo producto al menú
app.post('/api/restaurants/:restaurantIndex/menu', (req, res) => {
    const { restaurantIndex } = req.params;
    const newItem = req.body;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error al leer los datos');

        let restaurants = JSON.parse(data);

        if (restaurants[restaurantIndex]) {
            restaurants[restaurantIndex].menu.push(newItem);

            fs.writeFile(dataPath, JSON.stringify(restaurants, null, 2), err => {
                if (err) return res.status(500).send('Error al guardar los cambios');
                res.send('Producto agregado correctamente');
            });
        } else {
            res.status(404).send('Restaurante no encontrado');
        }
    });
});

// Ruta comodín para cualquier otra solicitud
app.get('*', (req, res) => {
    res.sendFile(path.resolve('index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
