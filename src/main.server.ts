import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

// Prerender/SSR entry point used by the @angular/ssr builder. Angular 19.2
// requires the server bootstrap to accept a BootstrapContext and forward it,
// otherwise route extraction fails with NG0401 "Missing Platform".
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
