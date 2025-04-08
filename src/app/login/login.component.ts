import { CommonModule } from '@angular/common';
import { Component, inject, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true
})
export class LoginComponent implements OnInit {

  isLoading: boolean = true;
  date: Date = new Date("2025-08-14");
  Prova: string = "Este texto deberia estar en mayusculas";
  formularioLogin: FormGroup;
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  toastr = inject(ToastrService);

  @Output() loggedin = new EventEmitter<string>();
  @Output() exportLoggedIn = new EventEmitter<boolean>();

  constructor(private form: FormBuilder) {
    this.formularioLogin = this.form.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const refreshToken = params['refreshToken'];
      
      if (token) {
        console.log("Token recibido:", token);
        localStorage.setItem('access_token', token);
        
        // Guardamos explícitamente el refresh token si existe
        if (refreshToken) {
          console.log("Refresh token recibido:", refreshToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        this.authService.handleGoogleCallback(token).subscribe({
          next: () => {
            this.isLoading = false; 
            this.exportLoggedIn.emit(true);
            this.toastr.success('Inicio de sesión exitoso', 'Bienvenido');
          },
          error: (error) => {
            console.error('Error en la autenticación con Google:', error);
            this.isLoading = false;
            this.toastr.error('Error en la autenticación con Google', 'Error');
          }
        });
      } else {
        this.isLoading = false;
      }
    });
    
    // Valores predeterminados para el formulario (solo para desarrollo)
    this.formularioLogin = this.form.group({
      email: ['joan1234@example.com', [Validators.required, Validators.email]],
      password: ['12345678', [Validators.required, Validators.minLength(8)]]
    });
  }

  hasError(controlName: string, errorType: string) {
    return this.formularioLogin.get(controlName)?.hasError(errorType) && this.formularioLogin.get(controlName)?.touched;
  }

  login() {
    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      return;
    }

    const loginData = this.formularioLogin.value;

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        
        // Verificamos explícitamente que se guarde el refresh token
        if (response.refreshToken) {
          console.log('Guardando refresh token:', response.refreshToken);
          localStorage.setItem('refresh_token', response.refreshToken);
        } else {
          console.warn('No se recibió refresh token en la respuesta');
        }
        
        this.exportLoggedIn.emit(true);
        this.toastr.success('Inicio de sesión exitoso', 'Bienvenido');
      },
      error: (error) => {
        console.error('Error en el login:', error);
        this.toastr.error('Error en el login, verifica tus credenciales', 'Error');
      }
    });
  }
  
  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}