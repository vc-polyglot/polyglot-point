import express from 'express';
import cors from 'cors';
import polyglotRoutes from '@platform/polyglot-point/backend/api-routes';
import mathRoutes from '@platform/lexipop-math/backend/api-routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'api-gateway',
    apps: ['polyglot-point', 'lexipop-math']
  });
});

// App routes
app.use('/api/polyglot', polyglotRoutes);
app.use('/api/math', mathRoutes);

app.listen(PORT, () => {
  console.log('API Gateway running on port ' + PORT);
  console.log('Polyglot Point: http://localhost:' + PORT + '/api/polyglot');
  console.log('LexiPop Math: http://localhost:' + PORT + '/api/math');
});
