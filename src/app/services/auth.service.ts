import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

// Definimos interfaces para tipar correctamente nuestras respuestas
interface LoginResponse {
  token: string;
  refreshToken?: string;
  user?: {
    name: string;
    email: string;
    role?: string;
  };
}

interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = "http://localhost:9000/api/auth";
  private userData: any = null;
  
  constructor(private http: HttpClient) {
    // Intenta cargar los datos del usuario guardados en localStorage
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        this.userData = JSON.parse(userDataStr);
      } catch (error) {
        console.error('Error al parsear los datos del usuario:', error);
      }
    }
  }
  
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          localStorage.setItem('access_token', response.token);
          
          // Guardamos el refresh token si existe
          if (response.refreshToken) {
            localStorage.setItem('refresh_token', response.refreshToken);
          }
          
          // Guardamos los datos del usuario
          if (response.user) {
            localStorage.setItem('user_data', JSON.stringify(response.user));
            this.userData = response.user;
          }
        }
      })
    );
  }
  
  loginWithGoogle(): void {
    window.location.href = `${this.apiUrl}/google`;
  }

  handleGoogleCallback(token: string): Observable<{success: boolean, token: string}> {
    localStorage.setItem('access_token', token);
    
    // Intentamos obtener información del usuario desde el token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload) {
        const userData = {
          name: payload.name || '',
          email: payload.id || '',
          role: payload.role || 'user'
        };
        localStorage.setItem('user_data', JSON.stringify(userData));
        this.userData = userData;
      }
    } catch (error) {
      console.error('Error al decodificar el token:', error);
    }
    
    return of({ success: true, token: token });
  }

  refreshToken(refreshToken: string): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh`, { refreshToken });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getUserData(): any {
    return this.userData;
  }

  getUserRole(): string {
    return this.userData?.role || 'user';
  }

  logout(): Observable<any> {
    // Hacemos una petición al backend para invalidar el refresh token
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        this.userData = null;
      })
    );
  }

  // Método para cerrar sesión localmente (sin petición al backend)
  logoutLocal(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    this.userData = null;
  }
}