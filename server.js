
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

const path = require('path');

// Ruta para servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para manejar cambios en los productos
app.post('/update-products', async (req, res) => {
  const { newData } = req.body;

  // Guardar cambios en el archivo JSON localmente
  const jsonFilePath = 'restaurants.json';
  fs.writeFileSync(jsonFilePath, JSON.stringify(newData, null, 2), 'utf8');

  try {
    // Subir cambios a GitHub
    await commitChanges(
      jsonFilePath,
      JSON.stringify(newData),
      'Actualizar productos del restaurante'
    );
    res.status(200).send({ message: 'Cambios guardados y subidos a GitHub' });
  } catch (error) {
    console.error('Error subiendo cambios a GitHub:', error);
    res.status(500).send({ message: 'Error subiendo cambios a GitHub' });
  }
});

// Función para realizar commit en GitHub
async function commitChanges(filePath, content, message) {
  const owner = "TU_NOMBRE_DE_USUARIO";
  const repo = "NOMBRE_DE_TU_REPOSITORIO";
  const branch = "main"; // Cambia esto si usas otro nombre de branch
  const token = process.env.GITHUB_TOKEN;

  let sha = null;

  // Obtener el SHA del archivo si ya existe
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

  // Crear o actualizar el archivo en el repositorio
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
