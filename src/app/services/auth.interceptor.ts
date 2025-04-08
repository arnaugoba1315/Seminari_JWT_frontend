import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export function jwtInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  console.log("Dentro del interceptador");

  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);

  // Si tenemos token, lo añadimos a la cabecera
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      console.log('Error interceptado:', error.status);
      
      // Si el error es 401 (No autorizado) y tenemos refresh token, intentamos refrescar el token
      if (error.status === 401 && refreshToken && !req.url.includes('auth/refresh')) {
        console.log('Intentando renovar token con refresh token:', refreshToken);
        
        return authService.refreshToken(refreshToken).pipe(
          switchMap(response => {
            console.log('Token renovado correctamente:', response);
            
            // Almacenamos el nuevo token
            localStorage.setItem('access_token', response.token);
            
            // Si también hay un nuevo refresh token, lo almacenamos
            if (response.refreshToken) {
              localStorage.setItem('refresh_token', response.refreshToken);
            }
            
            // Clonamos la petición original con el nuevo token
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.token}`
              }
            });
            
            // Reenviamos la petición original con el nuevo token
            return next(newReq);
          }),
          catchError(refreshError => {
            console.error('Error al renovar el token:', refreshError);
            
            // Si el refresh falla, limpiamos los tokens y redirigimos al login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            
            toastr.error(
              'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
              'Sesión Expirada',
              {
                timeOut: 3000,
                closeButton: true
              }
            );
            
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      
      // Si el error es 401 y no tenemos refresh token o es otro tipo de error, lo manejamos normalmente
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        toastr.error(
          'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
          'Sesión Expirada',
          {
            timeOut: 3000,
            closeButton: true
          }
        );
        
        router.navigate(['/login']);
      }
      
      return throwError(() => error);
    })
  );
}