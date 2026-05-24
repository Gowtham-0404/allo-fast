import { prisma } from '../lib/prisma';

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.productWarehouseStock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const warehouse1 = await prisma.warehouse.create({
    data: {
      code: 'WH-NYC',
      name: 'New York',
      location: 'New York, NY, USA',
    },
  });

  const warehouse2 = await prisma.warehouse.create({
    data: {
      code: 'WH-LAX',
      name: 'Los Angeles',
      location: 'Los Angeles, CA, USA',
    },
  });

  const warehouse3 = await prisma.warehouse.create({
    data: {
      code: 'WH-CHI',
      name: 'Chicago',
      location: 'Chicago, IL, USA',
    },
  });

  // Create products
  const product1 = await prisma.product.create({
    data: {
      sku: 'LAPTOP-001',
      name: 'High-Performance Laptop',
      description: 'Intel i9, 32GB RAM, 1TB SSD',
      price: 2499.99,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      sku: 'MOUSE-001',
      name: 'Wireless Mouse',
      description: 'Ergonomic design, 12-month battery',
      price: 49.99,
    },
  });

  const product3 = await prisma.product.create({
    data: {
      sku: 'KEYBOARD-001',
      name: 'Mechanical Keyboard',
      description: 'RGB backlit, Cherry MX switches',
      price: 149.99,
    },
  });

  const product4 = await prisma.product.create({
    data: {
      sku: 'MONITOR-001',
      name: '4K Display Monitor',
      description: '27-inch, 60Hz, USB-C charging',
      price: 599.99,
    },
  });

  // Create stock records for each product in each warehouse
  const stocks = [
    { productId: product1.id, warehouseId: warehouse1.id, totalUnits: 10 },
    { productId: product1.id, warehouseId: warehouse2.id, totalUnits: 15 },
    { productId: product1.id, warehouseId: warehouse3.id, totalUnits: 8 },
    { productId: product2.id, warehouseId: warehouse1.id, totalUnits: 100 },
    { productId: product2.id, warehouseId: warehouse2.id, totalUnits: 150 },
    { productId: product2.id, warehouseId: warehouse3.id, totalUnits: 80 },
    { productId: product3.id, warehouseId: warehouse1.id, totalUnits: 50 },
    { productId: product3.id, warehouseId: warehouse2.id, totalUnits: 75 },
    { productId: product3.id, warehouseId: warehouse3.id, totalUnits: 40 },
    { productId: product4.id, warehouseId: warehouse1.id, totalUnits: 20 },
    { productId: product4.id, warehouseId: warehouse2.id, totalUnits: 25 },
    { productId: product4.id, warehouseId: warehouse3.id, totalUnits: 15 },
  ];

  for (const stock of stocks) {
    await prisma.productWarehouseStock.create({
      data: {
        productId: stock.productId,
        warehouseId: stock.warehouseId,
        totalUnits: stock.totalUnits,
        reservedUnits: 0,
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log(`Created ${3} warehouses`);
  console.log(`Created ${4} products`);
  console.log(`Created ${12} stock records`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
