/**
 * 簡易測試框架
 *
 * 提供基本的測試功能，可在瀏覽器中執行
 */

const TestRunner = (function() {
    'use strict';

    const suites = [];
    let currentSuite = null;

    const results = {
        passed: 0,
        failed: 0,
        total: 0,
    };

    /**
     * 定義測試套件
     * @param {string} name - 套件名稱
     * @param {Function} fn - 測試函式
     */
    function describe(name, fn) {
        currentSuite = {
            name,
            tests: [],
            beforeEach: null,
            afterEach: null,
        };
        suites.push(currentSuite);
        fn();
        currentSuite = null;
    }

    /**
     * 定義單一測試
     * @param {string} name - 測試名稱
     * @param {Function} fn - 測試函式
     */
    function it(name, fn) {
        if (currentSuite) {
            currentSuite.tests.push({ name, fn });
        }
    }

    /**
     * 每個測試前執行
     * @param {Function} fn - 前置函式
     */
    function beforeEach(fn) {
        if (currentSuite) {
            currentSuite.beforeEach = fn;
        }
    }

    /**
     * 每個測試後執行
     * @param {Function} fn - 後置函式
     */
    function afterEach(fn) {
        if (currentSuite) {
            currentSuite.afterEach = fn;
        }
    }

    /**
     * 斷言函式
     */
    const assert = {
        equal(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(message || `Expected ${expected}, but got ${actual}`);
            }
        },

        deepEqual(actual, expected, message) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(message || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
            }
        },

        true(value, message) {
            if (value !== true) {
                throw new Error(message || `Expected true, but got ${value}`);
            }
        },

        false(value, message) {
            if (value !== false) {
                throw new Error(message || `Expected false, but got ${value}`);
            }
        },

        ok(value, message) {
            if (!value) {
                throw new Error(message || `Expected truthy value, but got ${value}`);
            }
        },

        notOk(value, message) {
            if (value) {
                throw new Error(message || `Expected falsy value, but got ${value}`);
            }
        },

        throws(fn, message) {
            let threw = false;
            try {
                fn();
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error(message || 'Expected function to throw');
            }
        },

        async rejects(promise, message) {
            let rejected = false;
            try {
                await promise;
            } catch (e) {
                rejected = true;
            }
            if (!rejected) {
                throw new Error(message || 'Expected promise to reject');
            }
        },

        isArray(value, message) {
            if (!Array.isArray(value)) {
                throw new Error(message || `Expected array, but got ${typeof value}`);
            }
        },

        isObject(value, message) {
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                throw new Error(message || `Expected object, but got ${typeof value}`);
            }
        },

        isFunction(value, message) {
            if (typeof value !== 'function') {
                throw new Error(message || `Expected function, but got ${typeof value}`);
            }
        },

        isNumber(value, message) {
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(message || `Expected number, but got ${typeof value}`);
            }
        },

        isString(value, message) {
            if (typeof value !== 'string') {
                throw new Error(message || `Expected string, but got ${typeof value}`);
            }
        },

        contains(array, item, message) {
            if (!array.includes(item)) {
                throw new Error(message || `Expected array to contain ${item}`);
            }
        },

        hasProperty(obj, prop, message) {
            if (!(prop in obj)) {
                throw new Error(message || `Expected object to have property ${prop}`);
            }
        },

        approximately(actual, expected, delta, message) {
            if (Math.abs(actual - expected) > delta) {
                throw new Error(message || `Expected ${actual} to be approximately ${expected} (delta: ${delta})`);
            }
        },
    };

    /**
     * 執行所有測試
     */
    async function runAll() {
        const output = document.getElementById('test-output');
        output.innerHTML = '';

        results.passed = 0;
        results.failed = 0;
        results.total = 0;

        for (const suite of suites) {
            const suiteDiv = document.createElement('div');
            suiteDiv.className = 'test-suite';
            suiteDiv.innerHTML = `<h2>${suite.name}</h2>`;

            for (const test of suite.tests) {
                results.total++;

                // 執行 beforeEach
                if (suite.beforeEach) {
                    try {
                        await suite.beforeEach();
                    } catch (e) {
                        console.error('beforeEach error:', e);
                    }
                }

                const testDiv = document.createElement('div');
                testDiv.className = 'test-case';

                try {
                    await test.fn();
                    results.passed++;
                    testDiv.className += ' pass';
                    testDiv.innerHTML = `<span class="test-icon">✓</span> ${test.name}`;
                } catch (error) {
                    results.failed++;
                    testDiv.className += ' fail';
                    testDiv.innerHTML = `
                        <span class="test-icon">✗</span>
                        ${test.name}
                        <div class="error-details">${error.message}</div>
                    `;
                }

                // 執行 afterEach
                if (suite.afterEach) {
                    try {
                        await suite.afterEach();
                    } catch (e) {
                        console.error('afterEach error:', e);
                    }
                }

                suiteDiv.appendChild(testDiv);
            }

            output.appendChild(suiteDiv);
        }

        // 更新摘要
        document.getElementById('pass-count').textContent = results.passed;
        document.getElementById('fail-count').textContent = results.failed;
        document.getElementById('total-count').textContent = results.total;

        console.log(`Tests completed: ${results.passed} passed, ${results.failed} failed, ${results.total} total`);

        return results;
    }

    // 公開 API
    return {
        describe,
        it,
        beforeEach,
        afterEach,
        assert,
        runAll,
        results,
    };
})();

// 全域匯出（方便測試檔案使用）
const describe = TestRunner.describe;
const it = TestRunner.it;
const beforeEach = TestRunner.beforeEach;
const afterEach = TestRunner.afterEach;
const assert = TestRunner.assert;
