
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const app = express();
// Aumentar el límite de tamaño para las solicitudes a 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Bloqueo para prevenir acceso concurrente
let isLocked = false;

// Función para manejar el bloqueo
async function withLock(action) {
  if (isLocked) {
    throw new Error('Otra actualización está en curso. Inténtalo de nuevo en unos segundos.');
  }
  isLocked = true;
  try {
    await action();
  } finally {
    isLocked = false;
  }
}

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

// Ruta para actualizar la imagen de portada del restaurante
app.put('/api/restaurants/:restaurantIndex/image', async (req, res) => {
  await withLock(async () => {
    const { restaurantIndex } = req.params;
    const { image } = req.body;

    let restaurants = require('./restaurants.json');
    const restIdx = parseInt(restaurantIndex);

    if (restaurants[restIdx]) {
        restaurants[restIdx].image = image;
        fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

        try {
            await commitChanges('restaurants.json', JSON.stringify(restaurants), 'Actualizar imagen de portada del restaurante');
            res.status(200).send({ message: 'Imagen de portada actualizada exitosamente' });
        } catch (error) {
            console.error('Error subiendo cambios a GitHub:', error.response ? error.response.data : error.message);
            res.status(500).send({ message: 'Imagen actualizada, pero no se pudo guardar en GitHub' });
        }
    } else {
        res.status(404).send({ message: 'Restaurante no encontrado' });
    }
  }).catch(error => {
    res.status(423).send({ message: error.message });
  });
});

// Ruta para actualizar el nombre del restaurante
app.put('/api/restaurants/:restaurantIndex/name', async (req, res) => {
  await withLock(async () => {
    const { restaurantIndex } = req.params;
    const { name } = req.body;

    let restaurants = require('./restaurants.json');
    const restIdx = parseInt(restaurantIndex);

    if (restaurants[restIdx]) {
        restaurants[restIdx].name = name;
        fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

        try {
            await commitChanges('restaurants.json', JSON.stringify(restaurants), 'Actualizar nombre del restaurante');
            res.status(200).send({ message: 'Nombre del restaurante actualizado exitosamente' });
        } catch (error) {
            console.error('Error subiendo cambios a GitHub:', error.response ? error.response.data : error.message);
            res.status(500).send({ message: 'Nombre actualizado, pero no se pudo guardar en GitHub' });
        }
    } else {
        res.status(404).send({ message: 'Restaurante no encontrado' });
    }
  }).catch(error => {
    res.status(423).send({ message: error.message });
  });
});

// Ruta para agregar un nuevo plato al menú y subir cambios a GitHub
app.post('/api/restaurants/:restaurantIndex/menu', async (req, res) => {
  await withLock(async () => {
    const { restaurantIndex } = req.params;
    const newItem = req.body;

    let restaurants = require('./restaurants.json');
    const restIdx = parseInt(restaurantIndex);

    if (restaurants[restIdx]) {
        restaurants[restIdx].menu.push(newItem);
        fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

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
  }).catch(error => {
    res.status(423).send({ message: error.message });
  });
});

// Ruta para eliminar un producto
app.delete('/api/restaurants/:restaurantIndex/menu/:itemIndex', async (req, res) => {
  await withLock(async () => {
    const { restaurantIndex, itemIndex } = req.params;

    let restaurants = require('./restaurants.json');
    const restIdx = parseInt(restaurantIndex);
    const itemIdx = parseInt(itemIndex);

    if (restaurants[restIdx] && restaurants[restIdx].menu[itemIdx]) {
      restaurants[restIdx].menu.splice(itemIdx, 1);
      fs.writeFileSync('restaurants.json', JSON.stringify(restaurants, null, 2), 'utf8');

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
  }).catch(error => {
    res.status(423).send({ message: error.message });
  });
});

// Función para realizar commit en GitHub con el SHA actualizado
async function commitChanges(filePath, content, message) {
  const owner = "Jaimex777";
  const repo = "FF55";
  const branch = "main";
  const token = process.env.GITHUB_TOKEN;

  let sha = null;

  // Obtener el SHA actualizado antes de cada commit
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: { Authorization: `token ${token}` },
    });
    sha = response.data.sha;
  } catch (err) {
    if (err.response && err.response.status !== 404) {
      console.error('Error obteniendo el archivo desde GitHub:', err.response.data);
      throw err;
    }
  }

  // Subir el contenido actualizado a GitHub
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
    console.error('Error subiendo cambios a GitHub:', err.response ? err.response.data : err.message);
    throw err;
  }
}

// Iniciar el servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
