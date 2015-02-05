require('shared-sofa-component-tasks')(require('gulp'), {
    pkg: require('./package.json'),
    baseDir: __dirname,
    testDependencyFiles: [
        'node_modules/sofa-testing/mocks/sofa.HttpService.mock.js',
        'node_modules/sofa-testing/mocks/sofa.products.mock.js',
        'node_modules/sofa-q-service/dist/sofa.QService.js',
        'node_modules/sofa-http-service/dist/sofa.HttpService.js'
    ]
});
