require('shared-sofa-component-tasks')(require('gulp'), {
    pkg: require('./package.json'),
    baseDir: __dirname,
    testDependencyFiles: [
        'node_modules/sofa-testing/helpers/md5.js',
        'node_modules/sofa-http-service/dist/sofa.httpService.js',
        'node_modules/sofa-testing/mocks/sofa.httpService.mock.js',
        'node_modules/sofa-testing/mocks/sofa.products.mock.js',
        'node_modules/sofa-testing/mocks/sofa.config.mock.js',
        'node_modules/sofa-q-service/dist/sofa.QService.js'
    ]
});
