# Frontend Applications

Documentation for Grid8 frontend applications.

---

## Overview

Grid8 has three frontend applications:

| Application | Port | Technology | Purpose |
|-------------|------|------------|---------|
| **frontenX** | 3011 | Express + JSX | Main application server |
| **admin_dashboard** | 8080 | React (CRA) | Admin panel |
| **client_dashboard** | 8081 | React (CRA) | Client interface |

---

## FrontenX

Server-rendered application using Express with JSX view engine.

### Technology Stack

- Express.js 4.18+
- Express Engine JSX (server-side rendering)
- Redis sessions
- HTMX for dynamic interactions
- SCSS for styling

### Directory Structure

```
frontenX/
├── frontend/
│   ├── components/       # Reusable JSX components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   └── ...
│   ├── layouts/          # Page layouts
│   │   ├── MainLayout.jsx
│   │   └── AuthLayout.jsx
│   └── views/            # Page views
│       ├── Home.jsx
│       ├── Brand.jsx
│       ├── Project.jsx
│       └── ...
├── routes/
│   ├── controller.js     # Main routes
│   ├── brands.js         # Brand routes
│   └── projects.js       # Project routes
├── services/
│   ├── brand.js          # Brand API service
│   ├── project.js        # Project API service
│   ├── notification.js   # Notification service
│   ├── s3.js             # S3 service
│   └── redis.js          # Redis service
├── grid8/
│   └── player/           # Grid8 player library
├── utils/
│   └── helpers.js        # Utility functions
├── public/
│   ├── css/              # Compiled CSS
│   ├── js/               # Client-side JavaScript
│   └── images/           # Static images
├── config/
│   └── index.js          # Configuration
└── app.js                # Express application
```

### Code Style (from GEMINI.md)

**Component Organization:**
```jsx
// frontend/components/Button.jsx
export function Button({ children, variant = 'primary', onClick }) {
  return (
    <button
      className={`btn btn--${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

**CSS Organization:**
```
public/css/
├── components/
│   └── Button.css        # Matches component path
├── layouts/
│   └── MainLayout.css
└── views/
    └── Home.css
```

**HTMX Patterns:**
```jsx
// HTMX-enabled component
<div
  hx-get="/api/data"
  hx-trigger="load"
  hx-target="#content"
  hx-swap="innerHTML"
>
  Loading...
</div>
```

**S3 Profile Images:**
```
s3://bucket/avatars/{userId}/profile.jpg
```

### Running FrontenX

```bash
cd frontenX
yarn install
cp .env.example .env
yarn dev  # Development with hot reload

# Production
yarn build
yarn start
```

### Testing

```bash
# Jest E2E tests
yarn test

# Playwright UI tests
yarn test:e2e
```

---

## Admin Dashboard

Full-featured React admin panel for system management.

### Technology Stack

- React 18
- Create React App
- Redux Toolkit
- React Router v5
- ag-grid-enterprise
- Bootstrap + SCSS
- Formik for forms

### Directory Structure

```
admin_dashboard/
├── src/
│   ├── components/
│   │   ├── common/           # Shared components
│   │   │   ├── Button/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   └── Form/
│   │   └── specific/         # Feature-specific components
│   ├── pages/
│   │   ├── brand/            # Brand management
│   │   ├── color/            # Color management
│   │   ├── comment/          # Comment management
│   │   ├── file/             # File management
│   │   ├── login/            # Authentication
│   │   ├── mailTemplates/    # Email templates
│   │   ├── previews/         # Preview management
│   │   ├── profile/          # User profile
│   │   ├── project/          # Project management
│   │   ├── team/             # Team management
│   │   ├── tools/            # Utilities
│   │   ├── user/             # User management
│   │   ├── videobuilder/     # Video builder
│   │   └── videoTemplates/   # Video templates
│   ├── helpers/
│   │   ├── api.js            # API utilities
│   │   ├── auth.js           # Auth utilities
│   │   └── utils.js          # General utilities
│   ├── services/
│   │   ├── authService.js
│   │   ├── brandService.js
│   │   ├── projectService.js
│   │   └── ...
│   ├── store.ts              # Redux store
│   ├── App.js
│   └── index.js
├── public/
└── package.json
```

### State Management (Redux Toolkit)

```typescript
// src/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import brandReducer from './slices/brandSlice';
import projectReducer from './slices/projectSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    brand: brandReducer,
    project: projectReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// src/slices/brandSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { brandService } from '../services/brandService';

export const fetchBrands = createAsyncThunk(
  'brand/fetchAll',
  async () => {
    const response = await brandService.getAll();
    return response.data;
  }
);

const brandSlice = createSlice({
  name: 'brand',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default brandSlice.reducer;
```

### API Service Pattern

```javascript
// src/services/brandService.js
import api from '../helpers/api';

export const brandService = {
  getAll: () => api.get('/corp/brand'),
  getById: (id) => api.get(`/corp/brand/${id}`),
  create: (data) => api.post('/corp/brand', data),
  update: (id, data) => api.put(`/corp/brand/${id}`, data),
  delete: (id) => api.delete(`/corp/brand/${id}`),
};
```

### Component Pattern

```jsx
// src/pages/brand/BrandList.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import { fetchBrands } from '../../slices/brandSlice';

export function BrandList() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.brand);

  useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  const columnDefs = [
    { field: 'name', sortable: true, filter: true },
    { field: 'slug', sortable: true },
    { field: 'createdAt', sortable: true },
    {
      field: 'actions',
      cellRenderer: (params) => (
        <button onClick={() => handleEdit(params.data)}>
          Edit
        </button>
      ),
    },
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div className="ag-theme-alpine" style={{ height: 500 }}>
      <AgGridReact
        rowData={items}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={20}
      />
    </div>
  );
}
```

### Running Admin Dashboard

```bash
cd admin_dashboard
yarn install
cp .env.example .env
yarn start  # Development server on :8080

# Production build
yarn build
```

### Kubernetes Namespaces

- Development: `dco-development-admin-dashboard`
- Production: `dco-production-admin-dashboard`

---

## Client Dashboard

React application for end-users/clients.

### Technology Stack

Same as Admin Dashboard:
- React 18
- Create React App
- Redux Toolkit
- React Router v5
- ag-grid-enterprise
- Bootstrap + SCSS

### Directory Structure

```
client_dashboard/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── assets/           # Asset viewing
│   │   ├── comments/         # Comment management
│   │   ├── dashboard/        # Main dashboard
│   │   ├── login/            # Authentication
│   │   ├── profile/          # User profile
│   │   ├── projects/         # Project viewing
│   │   └── previews/         # Preview viewing
│   ├── helpers/
│   ├── services/
│   ├── store.ts
│   ├── App.js
│   └── index.js
├── public/
└── package.json
```

### Key Differences from Admin

| Feature | Admin | Client |
|---------|-------|--------|
| User management | Full CRUD | View only |
| Brand management | Full CRUD | View assigned |
| Project management | Full CRUD | View + Comment |
| Asset management | Full CRUD | View + Download |
| Team management | Full CRUD | View only |
| Settings | Full access | Limited |

### Running Client Dashboard

```bash
cd client_dashboard
yarn install
cp .env.example .env
yarn start  # Development server on :8081

# Production build
yarn build
```

---

## Shared Components

### Common UI Components

Both React apps share similar component patterns:

**Button Component:**
```jsx
// components/common/Button/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './Button.scss';

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  ...props
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? <Spinner size="small" /> : children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
};
```

**Modal Component:**
```jsx
// components/common/Modal/Modal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import './Modal.scss';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
```

**Form with Formik:**
```jsx
// components/common/Form/BrandForm.jsx
import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  slug: Yup.string()
    .matches(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens')
    .required('Slug is required'),
});

export function BrandForm({ initialValues, onSubmit }) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ isSubmitting }) => (
        <Form>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <Field name="name" type="text" className="form-control" />
            <ErrorMessage name="name" component="div" className="error" />
          </div>

          <div className="form-group">
            <label htmlFor="slug">Slug</label>
            <Field name="slug" type="text" className="form-control" />
            <ErrorMessage name="slug" component="div" className="error" />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

---

## API Integration

### API Client Setup

```javascript
// helpers/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### WebSocket Connection

```javascript
// helpers/websocket.js
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const listeners = this.listeners.get(data.type) || [];
      listeners.forEach((callback) => callback(data.payload));
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(() => this.connect(), 3000);
    };
  }

  subscribe(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  unsubscribe(type, callback) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((cb) => cb !== callback));
  }
}

export const wsClient = new WebSocketClient(process.env.REACT_APP_WS_URL);
```

---

## Testing

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
  ],
};
```

### Example Tests

```javascript
// src/components/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Playwright E2E Tests

```javascript
// e2e/login.spec.js
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## Build & Deployment

### Build Commands

```bash
# Development
yarn start

# Production build
yarn build

# Analyze bundle
yarn build && yarn analyze
```

### Environment-Specific Builds

```bash
# Development
REACT_APP_ENV=development yarn build

# Staging
REACT_APP_ENV=staging yarn build

# Production
REACT_APP_ENV=production yarn build
```

### Docker Build

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

*See [WORKFLOWS.md](./WORKFLOWS.md) for common user workflows.*
