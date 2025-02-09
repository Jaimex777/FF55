
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

// Ruta para servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Ruta para obtener la lista de restaurantes
app.get('/api/restaurants', (req, res) => {
  fs.readFile('restaurants.json', 'utf8', (err, data) => {
    if (err) {
      res.status(500).send({ message: 'Error leyendo el archivo de restaurantes' });
    } else {
      res.json(JSON.parse(data));
    }
  });
});

// Ruta para agregar un nuevo plato al menú
app.post('/api/restaurants/:restaurantIndex/menu', (req, res) => {
  const { restaurantIndex } = req.params;
  const newItem = req.body;

  let restaurants = require('./restaurants.json');
  const restIdx = parseInt(restaurantIndex);

  if (restaurants[restIdx]) {
      restaurants[restIdx].menu.push(newItem);
      fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');
      res.status(200).send({ message: 'Producto agregado exitosamente' });
  } else {
      res.status(404).send({ message: 'Restaurante no encontrado' });
  }
});

// Ruta para manejar cambios en los productos
app.post('/update-products', async (req, res) => {
  const { newData } = req.body;

  const jsonFilePath = 'restaurants.json';
  fs.writeFileSync(jsonFilePath, JSON.stringify(newData, null, 2), 'utf8');

  try {
    await commitChanges(jsonFilePath, JSON.stringify(newData), 'Actualizar productos del restaurante');
    res.status(200).send({ message: 'Cambios guardados y subidos a GitHub' });
  } catch (error) {
    console.error('Error subiendo cambios a GitHub:', error);
    res.status(500).send({ message: 'Error subiendo cambios a GitHub' });
  }
});

// Ruta para eliminar un producto
app.delete('/api/restaurants/:restaurantIndex/menu/:itemIndex', (req, res) => {
  const { restaurantIndex, itemIndex } = req.params;

  let restaurants = require('./restaurants.json');

  const restIdx = parseInt(restaurantIndex);
  const itemIdx = parseInt(itemIndex);

  if (restaurants[restIdx] && restaurants[restIdx].menu[itemIdx]) {
    restaurants[restIdx].menu.splice(itemIdx, 1);

    fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

    res.status(200).send({ message: 'Producto eliminado exitosamente' });
  } else {
    res.status(404).send({ message: 'Producto no encontrado' });
  }
});

// Función para realizar commit en GitHub
async function commitChanges(filePath, content, message) {
  const owner = "TU_NOMBRE_DE_USUARIO";
  const repo = "NOMBRE_DE_TU_REPOSITORIO";
  const branch = "main";
  const token = process.env.GITHUB_TOKEN;

  let sha = null;

  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: { Authorization: `token ${token}` },
    });
    sha = response.data.sha;
  } catch (err) {
    if (err.response && err.response.status !== 404) {
      throw new Error(`Error obteniendo el archivo desde GitHub: ${err.message}`);
    }
  }

  await axios.put(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      message: message,
      content: Buffer.from(content).toString('base64'),
      sha: sha,
    },
    { headers: { Authorization: `token ${token}` } }
  );
}

// Iniciar el servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
