
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

// Ruta para agregar un nuevo plato al menú y subir cambios a GitHub
app.post('/api/restaurants/:restaurantIndex/menu', async (req, res) => {
  const { restaurantIndex } = req.params;
  const newItem = req.body;

  let restaurants = require('./restaurants.json');
  const restIdx = parseInt(restaurantIndex);

  if (restaurants[restIdx]) {
      restaurants[restIdx].menu.push(newItem);
      fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

      // Subir los cambios a GitHub después de agregar el producto
      try {
          await commitChanges('restaurants.json', JSON.stringify(restaurants), 'Agregar nuevo producto');
          res.status(200).send({ message: 'Producto agregado y guardado en GitHub exitosamente' });
      } catch (error) {
          console.error('Error subiendo cambios a GitHub:', error.response ? error.response.data : error.message);
          res.status(500).send({ message: 'Producto agregado, pero no se pudo guardar en GitHub' });
      }

  } else {
      res.status(404).send({ message: 'Restaurante no encontrado' });
  }
});

// Ruta para eliminar un producto
app.delete('/api/restaurants/:restaurantIndex/menu/:itemIndex', async (req, res) => {
  const { restaurantIndex, itemIndex } = req.params;

  let restaurants = require('./restaurants.json');

  const restIdx = parseInt(restaurantIndex);
  const itemIdx = parseInt(itemIndex);

  if (restaurants[restIdx] && restaurants[restIdx].menu[itemIdx]) {
    restaurants[restIdx].menu.splice(itemIdx, 1);
    fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

    // Subir cambios a GitHub después de eliminar el producto
    try {
        await commitChanges('restaurants.json', JSON.stringify(restaurants), 'Eliminar producto');
        res.status(200).send({ message: 'Producto eliminado y cambios guardados en GitHub' });
    } catch (error) {
        console.error('Error subiendo cambios a GitHub:', error.response ? error.response.data : error.message);
        res.status(500).send({ message: 'Producto eliminado, pero no se pudo guardar en GitHub' });
    }

  } else {
    res.status(404).send({ message: 'Producto no encontrado' });
  }
});

// Función para realizar commit en GitHub con registro detallado de errores
async function commitChanges(filePath, content, message) {
  const owner = "Jaimex777";
  const repo = "FF55";
  const branch = "main";
  const token = process.env.GITHUB_TOKEN;

  let sha = null;

  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: { Authorization: `token ${token}` },
    });
    sha = response.data.sha;
  } catch (err) {
    if (err.response) {
      console.error('Error obteniendo el archivo desde GitHub:', err.response.data);
    } else {
      console.error('Error obteniendo el archivo desde GitHub:', err.message);
    }
    throw err;
  }

  try {
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        message: message,
        content: Buffer.from(content).toString('base64'),
        sha: sha,
      },
      { headers: { Authorization: `token ${token}` } }
    );
  } catch (err) {
    if (err.response) {
      console.error('Error subiendo cambios a GitHub:', err.response.data);
    } else {
      console.error('Error subiendo cambios a GitHub:', err.message);
    }
    throw err;
  }
}

// Iniciar el servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
