# OAH Signup - Appointment Booking System

A React-based appointment booking system for OAH (Oli At Home) services with zipcode validation and provider matching.

## Features

- **Step 1**: Address/Zipcode search with middleware API integration
- **Step 2**: Service selection with category-based filtering
- **Step 3**: Date and time selection with availability checking
- **Step 4**: Appointment confirmation

## Getting started

> **Prerequisites:**
> The following steps require [NodeJS](https://nodejs.org/en/) to be installed on your system, so please
> install it beforehand if you haven't already.

### 1. Install dependencies

```
npm install
```

### 2. Start the middleware server

This frontend application requires the middleware server to be running. The middleware handles all API keys and external service integrations.

Then, you'll be able to run a development version of the project with:

```
npm run dev
```

After a few seconds, your project should be accessible at the address
[http://localhost:5173/](http://localhost:5173/)


If you are satisfied with the result, you can finally build the project for release with:

```
npm run build
```
