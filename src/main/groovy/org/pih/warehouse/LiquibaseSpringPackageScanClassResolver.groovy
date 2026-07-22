package org.pih.warehouse

import liquibase.servicelocator.DefaultPackageScanClassResolver
import liquibase.servicelocator.PackageScanFilter
import org.springframework.core.io.Resource
import org.springframework.core.io.support.PathMatchingResourcePatternResolver
import org.springframework.core.type.classreading.CachingMetadataReaderFactory
import org.springframework.core.type.classreading.MetadataReaderFactory

/**
 * Liquibase 3.x's default ServiceLocator scans the classpath itself and cannot
 * see inside Spring Boot nested jars. Spring Boot used to install a
 * Spring-based resolver via LiquibaseServiceLocatorApplicationListener, but
 * that was removed in Spring Boot 2.6 (Liquibase 4.x no longer needs it).
 * This is a port of Spring Boot's former SpringPackageScanClassResolver so
 * Liquibase 3.x service discovery keeps working inside the runnable war.
 */
class LiquibaseSpringPackageScanClassResolver extends DefaultPackageScanClassResolver {

    @Override
    protected void find(PackageScanFilter test, String packageName, Set<Class<?>> classes) {
        String pattern = 'classpath*:' + packageName.replace('.', '/') + '/**/*.class'
        for (ClassLoader classLoader : getClassLoaders()) {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver(classLoader)
            MetadataReaderFactory metadataReaderFactory = new CachingMetadataReaderFactory(resolver)
            try {
                for (Resource resource : resolver.getResources(pattern)) {
                    try {
                        String className = metadataReaderFactory.getMetadataReader(resource).classMetadata.className
                        Class<?> clazz = classLoader.loadClass(className)
                        if (test.matches(clazz)) {
                            classes.add(clazz)
                        }
                    }
                    catch (Throwable ignored) {
                        // ignore unloadable classes, same as the default resolver
                    }
                }
            }
            catch (IOException ignored) {
                // continue with the next classloader
            }
        }
    }
}
