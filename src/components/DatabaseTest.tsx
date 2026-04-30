import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import * as db from '@/lib/db';
import { generateId } from '@/lib/store';
import { Product, Client, Supplier, Bon, Sale, Payment, Invoice, CustomSaleCard } from '@/lib/types';

export const DatabaseTest = () => {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const log = (msg: string) => {
        console.log(`[Test] ${msg}`);
        setStatus(prev => prev + msg + '\n');
    };

    const runTests = async () => {
        setLoading(true);
        setStatus('Starting Tests...\n');
        try {
            log('Checking Database Connection...');
            const database = await db.initDb();
            log('Database Initialized.');

            // 0. Connection check
            const connectionCheck = await database.select<any[]>('SELECT 1 as connected');
            if (connectionCheck[0]?.connected !== 1) throw new Error('Basic connection check failed');
            log('Connection verified: OK');

            // 1. PRODUCTS
            log('Testing Products...');
            const productId = 'test-p-' + generateId();
            const product: Product = { id: productId, name: 'Test Product', nameAr: 'تجرية', category: 'divers', priceSale: 100, priceBuy: 50, stock: 10, unit: 'unité' };
            await db.saveProducts([product]);
            const products = await db.getProducts();
            const foundProduct = products.find(p => p.id === productId);
            if (!foundProduct) throw new Error('Product not found after save');
            log('Product Insert/Read Success');

            await db.updateProduct({ ...foundProduct, name: 'Updated Product' });
            const products2 = await db.getProducts();
            if (products2.find(p => p.id === productId)?.name !== 'Updated Product') throw new Error('Product not updated');
            log('Product Update Success');

            await db.deleteProduct(productId);
            const products3 = await db.getProducts();
            if (products3.find(p => p.id === productId)) throw new Error('Product not deleted');
            log('Product Delete Success');

            // ... (rest of tests)
            log('Other tests skipped for now to focus on Products failure...');

            log('\nBASIC PRODUCTS TEST PASSED!');
        } catch (err: any) {
            console.error('Test error detail:', err);
            const errMsg = err?.message || JSON.stringify(err) || 'Unknown error';
            log('TEST FAILED: ' + errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999, background: 'white', padding: '20px', border: '2px solid black', borderRadius: '10px', maxWidth: '400px' }}>
            <h3 className="font-bold mb-2">DB Test Tool</h3>
            <pre style={{ fontSize: '10px', height: '200px', overflowY: 'auto', background: '#f0f0f0', padding: '5px', marginBottom: '10px' }}>{status}</pre>
            <div className="flex gap-2">
                <Button onClick={runTests} disabled={loading}>{loading ? 'Running...' : 'Run DB Tests'}</Button>
                <Button variant="outline" onClick={() => setStatus('')}>Clear</Button>
            </div>
        </div>
    );
};
