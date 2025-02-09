
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const dataPath = path.join(__dirname, 'restaurants.json');

app.use(express.json());

// Servir archivos estáticos de la raíz
app.use('/', express.static(path.join(__dirname)));

// Rutas API
app.get('/api/restaurants', (req, res) => {
    console.log('GET /api/restaurants llamado');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error al leer los datos');
        res.json(JSON.parse(data));
    });
});

app.delete('/api/restaurants/:restaurantIndex/menu/:itemIndex', (req, res) => {
    const { restaurantIndex, itemIndex } = req.params;
    console.log(`DELETE /api/restaurants/${restaurantIndex}/menu/${itemIndex} llamado`);

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

// Ruta comodín para cualquier otra solicitud
app.get('*', (req, res) => {
    console.log(`Ruta desconocida llamada: ${req.originalUrl}`);
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
