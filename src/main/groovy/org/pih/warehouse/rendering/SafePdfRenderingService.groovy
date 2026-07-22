package org.pih.warehouse.rendering

import grails.plugins.rendering.pdf.PdfRenderingService
import org.xhtmlrenderer.pdf.ITextRenderer
import org.xhtmlrenderer.pdf.ITextUserAgent

/**
 * PDF rendering service that installs Flying Saucer's stock ITextUserAgent
 * instead of the rendering plugin's DataUriAwareITextUserAgent.
 *
 * The plugin's user agent was compiled with Groovy 2, and on Groovy 4 its
 * `super.getImageResource(uri)` call (compiled to
 * ScriptBytecodeAdapter.invokeMethodOnSuperN) dispatches back to the subclass
 * override, recursing until a StackOverflowError on every PDF that contains
 * an image. Flying Saucer 9.1.x's ITextUserAgent natively supports the
 * embedded base64 data-URI images the plugin's subclass was written for, so
 * the stock user agent is a drop-in replacement.
 *
 * Registered as `pdfRenderingService` in resources.groovy, overriding the
 * plugin's bean. Extends the plugin's PdfRenderingService because
 * RenderingTrait declares the injected property with that exact type.
 */
class SafePdfRenderingService extends PdfRenderingService {

    @Override
    protected configureRenderer(ITextRenderer renderer) {
        ITextUserAgent userAgent = new ITextUserAgent(renderer.outputDevice)
        renderer.sharedContext.userAgentCallback = userAgent
        userAgent.sharedContext = renderer.sharedContext
        return userAgent
    }

    // The legacy Events trait baked into the plugin's compiled service class
    // surfaces as abstract to the Groovy 4 compiler; delegate to the parent's
    // concrete runtime implementation.
    reactor.bus.Bus sendAndReceive(Object key, groovy.lang.Closure closure) {
        return super.sendAndReceive(key, closure)
    }
}
