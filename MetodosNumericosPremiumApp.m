classdef MetodosNumericosPremiumApp < matlab.apps.AppBase

    % ==============================================================
    % APP PROFESIONAL DE MÉTODOS NUMÉRICOS
    % Grupo 6:
    % Newton-Raphson Multivariable vs Sistemas de Ecuaciones Lineales
    %
    % Incluye:
    % - Newton-Raphson multivariable
    % - Jacobiana numérica por diferencias finitas centradas
    % - Gauss-Jordan con pivoteo parcial
    % - Factorización LU
    % - Ejemplos precargados
    % - Ayudas visuales para el usuario
    % - Gráficas 2D/3D
    % ==============================================================

    properties (Access = public)

        % Ventana principal
        UIFigure matlab.ui.Figure

        % Layout principal
        MainGrid matlab.ui.container.GridLayout

        % Panel izquierdo
        LeftPanel matlab.ui.container.Panel
        LeftGrid matlab.ui.container.GridLayout
        TitleLabel matlab.ui.control.Label
        SubtitleLabel matlab.ui.control.Label

        % Tabs
        Tabs matlab.ui.container.TabGroup
        HomeTab matlab.ui.container.Tab
        NewtonTab matlab.ui.container.Tab
        LinearTab matlab.ui.container.Tab

        % Home
        HomeGrid matlab.ui.container.GridLayout
        HomeTitle matlab.ui.control.Label
        HomeSubtitle matlab.ui.control.Label
        HomeText matlab.ui.control.TextArea
        HomeStartButton matlab.ui.control.Button

        % Newton
        NewtonGrid matlab.ui.container.GridLayout
        NewtonExampleLabel matlab.ui.control.Label
        NewtonExampleDropDown matlab.ui.control.DropDown
        LoadNewtonExampleButton matlab.ui.control.Button
        NonlinearSystemLabel matlab.ui.control.Label
        NonlinearHelpButton matlab.ui.control.Button
        NonlinearSystemTextArea matlab.ui.control.TextArea
        InitialGuessLabel matlab.ui.control.Label
        InitialGuessEditField matlab.ui.control.EditField
        ToleranceLabel matlab.ui.control.Label
        ToleranceEditField matlab.ui.control.NumericEditField
        MaxIterLabel matlab.ui.control.Label
        MaxIterEditField matlab.ui.control.NumericEditField
        SolveNewtonButton matlab.ui.control.Button

        % Lineal
        LinearGrid matlab.ui.container.GridLayout
        LinearExampleLabel matlab.ui.control.Label
        LinearExampleDropDown matlab.ui.control.DropDown
        LoadLinearExampleButton matlab.ui.control.Button
        MatrixALabel matlab.ui.control.Label
        MatrixHelpButton matlab.ui.control.Button
        MatrixATextArea matlab.ui.control.TextArea
        VectorBLabel matlab.ui.control.Label
        VectorBEditField matlab.ui.control.EditField
        SolveLinearButton matlab.ui.control.Button

        % Botones globales
        ClearButton matlab.ui.control.Button
        HelpButton matlab.ui.control.Button

        % Panel derecho
        RightPanel matlab.ui.container.Panel
        RightGrid matlab.ui.container.GridLayout
        MainAxes matlab.ui.control.UIAxes
        ResultsPanel matlab.ui.container.Panel
        ResultsGrid matlab.ui.container.GridLayout
        SummaryLabel matlab.ui.control.Label
        ResultsTextArea matlab.ui.control.TextArea
        StepsTable matlab.ui.control.Table
    end

    properties (Access = private)
        % Colores estilo premium
        DarkBackground = [0.035 0.045 0.065]
        PanelBackground = [0.07 0.09 0.13]
        CardBackground = [0.105 0.13 0.19]
        AccentBlue = [0.12 0.43 0.95]
        AccentCyan = [0.10 0.75 0.95]
        AccentGreen = [0.12 0.72 0.42]
        AccentPurple = [0.45 0.25 0.95]
        AccentRed = [0.95 0.25 0.25]
        TextColor = [0.94 0.96 1.00]
        MutedTextColor = [0.65 0.72 0.82]
    end

    methods (Access = private)

        % ==============================================================
        % STARTUP
        % Se ejecuta cuando abre la aplicación.
        % ==============================================================

        function startupFcn(app)
            app.loadExampleLists();

            app.ResultsTextArea.Value = {
                'BIENVENIDO'
                ''
                'Esta aplicación resuelve y compara métodos numéricos del Grupo 6.'
                ''
                '1) Newton-Raphson Multivariable'
                '2) Sistemas de Ecuaciones Lineales: Gauss-Jordan vs LU'
                ''
                'Use los ejemplos precargados o ingrese sus propios datos.'
                };

            app.StepsTable.Data = {};
            app.StepsTable.ColumnName = {'Estado', 'Información'};

            cla(app.MainAxes);
            title(app.MainAxes, 'Visualización dinámica 2D / 3D');
            xlabel(app.MainAxes, 'x');
            ylabel(app.MainAxes, 'y');
            zlabel(app.MainAxes, 'z');
            grid(app.MainAxes, 'on');
            rotate3d(app.UIFigure, 'on');
        end

        % ==============================================================
        % LISTAS DE EJEMPLOS
        % ==============================================================

        function loadExampleLists(app)
            newtonExamples = app.getNewtonExamples();
            linearExamples = app.getLinearExamples();

            app.NewtonExampleDropDown.Items = {newtonExamples.Name};
            app.LinearExampleDropDown.Items = {linearExamples.Name};

            app.NewtonExampleDropDown.Value = newtonExamples(1).Name;
            app.LinearExampleDropDown.Value = linearExamples(1).Name;
        end

        function examples = getNewtonExamples(app) %#ok<MANU>
            examples = struct([]);

            examples(1).Name = '1) Circunferencia y recta 2D';
            examples(1).Equations = {'x^2 + y^2 - 25'; 'y - 0.75*x - 1'};
            examples(1).InitialGuess = '[4; 4]';
            examples(1).Tolerance = 1e-6;
            examples(1).MaxIter = 50;
            examples(1).Description = 'Intersección de una circunferencia con una recta. Ejemplo visual 2D.';

            examples(2).Name = '2) Sistema trigonométrico 2D';
            examples(2).Equations = {'sin(x) + y^2 - 1'; 'x^2 + y - 1'};
            examples(2).InitialGuess = '[0.7; 0.5]';
            examples(2).Tolerance = 1e-7;
            examples(2).MaxIter = 60;
            examples(2).Description = 'Sistema no lineal con seno y términos cuadráticos.';

            examples(3).Name = '3) Sistema tipo Rosenbrock';
            examples(3).Equations = {'2*(x - 1) + 400*x*(x^2 - y)'; '200*(y - x^2)'};
            examples(3).InitialGuess = '[-1.2; 1]';
            examples(3).Tolerance = 1e-6;
            examples(3).MaxIter = 100;
            examples(3).Description = 'Sistema relacionado con optimización numérica.';

            examples(4).Name = '4) Esfera y planos 3D';
            examples(4).Equations = {'x^2 + y^2 + z^2 - 9'; 'x + y + z - 3'; 'x - y + z - 1'};
            examples(4).InitialGuess = '[2; 1; 0]';
            examples(4).Tolerance = 1e-6;
            examples(4).MaxIter = 80;
            examples(4).Description = 'Intersección entre esfera y planos. Excelente para mostrar gráfica 3D.';

            examples(5).Name = '5) Sistema exponencial 3D';
            examples(5).Equations = {'x^2 + y^2 - 4'; 'y + z - 1'; 'exp(x) + z - 3'};
            examples(5).InitialGuess = '[1; 1; 0]';
            examples(5).Tolerance = 1e-6;
            examples(5).MaxIter = 80;
            examples(5).Description = 'Sistema con exponencial y tres variables.';

            examples(6).Name = '6) Equilibrio no lineal 3D';
            examples(6).Equations = {'x^2 + y^2 + z^2 - 6'; 'x*y - z - 1'; 'x + y - z - 1'};
            examples(6).InitialGuess = '[2; 1; 1]';
            examples(6).Tolerance = 1e-6;
            examples(6).MaxIter = 80;
            examples(6).Description = 'Sistema de equilibrio no lineal con tres incógnitas.';

            examples(7).Name = '7) Curva cúbica y circunferencia 2D';
            examples(7).Equations = {'x^3 - y + 1'; 'x^2 + y^2 - 4'};
            examples(7).InitialGuess = '[1; 1.5]';
            examples(7).Tolerance = 1e-6;
            examples(7).MaxIter = 70;
            examples(7).Description = 'Sistema algebraico no lineal con varias posibles intersecciones.';
        end

        function examples = getLinearExamples(app) %#ok<MANU>
            examples = struct([]);

            examples(1).Name = '1) Sistema 3x3 clásico';
            examples(1).A = {'[4 -1 0;'; ' -1 4 -1;'; ' 0 -1 3]'};
            examples(1).b = '[15; 10; 10]';
            examples(1).Description = 'Sistema tridiagonal clásico.';

            examples(2).Name = '2) Sistema 2x2 con rectas';
            examples(2).A = {'[2 1;'; ' 1 -1]'};
            examples(2).b = '[5; 1]';
            examples(2).Description = 'Dos rectas cuya intersección es la solución.';

            examples(3).Name = '3) Planos 3D';
            examples(3).A = {'[1 1 1;'; ' 2 -1 1;'; ' 1 2 -1]'};
            examples(3).b = '[6; 3; 3]';
            examples(3).Description = 'Tres planos que se intersectan en un punto.';

            examples(4).Name = '4) Circuito eléctrico simple';
            examples(4).A = {'[10 -2 0;'; ' -2 8 -1;'; ' 0 -1 5]'};
            examples(4).b = '[12; 7; 4]';
            examples(4).Description = 'Sistema inspirado en análisis de mallas eléctricas.';

            examples(5).Name = '5) Sistema 4x4';
            examples(5).A = {'[6 -2 1 0;'; ' -2 7 -1 1;'; ' 1 -1 5 -2;'; ' 0 1 -2 4]'};
            examples(5).b = '[9; -3; 8; 2]';
            examples(5).Description = 'Sistema de cuatro incógnitas. No se grafica, pero sí se compara.';

            examples(6).Name = '6) Matriz tipo ingeniería';
            examples(6).A = {'[12 -3 0 0;'; ' -3 10 -2 0;'; ' 0 -2 8 -1;'; ' 0 0 -1 6]'};
            examples(6).b = '[20; 15; 10; 5]';
            examples(6).Description = 'Matriz con estructura parecida a problemas de ingeniería.';

            examples(7).Name = '7) Sistema 5x5 tridiagonal';
            examples(7).A = {'[4 -1 0 0 0;'; ' -1 4 -1 0 0;'; ' 0 -1 4 -1 0;'; ' 0 0 -1 4 -1;'; ' 0 0 0 -1 4]'};
            examples(7).b = '[100; 100; 100; 100; 100]';
            examples(7).Description = 'Sistema 5x5 tridiagonal común en discretización numérica.';
        end

        % ==============================================================
        % CARGA DE EJEMPLOS
        % ==============================================================

        function LoadNewtonExampleButtonPushed(app, ~)
            examples = app.getNewtonExamples();
            idx = find(strcmp({examples.Name}, app.NewtonExampleDropDown.Value), 1);

            ex = examples(idx);
            app.NonlinearSystemTextArea.Value = ex.Equations;
            app.InitialGuessEditField.Value = ex.InitialGuess;
            app.ToleranceEditField.Value = ex.Tolerance;
            app.MaxIterEditField.Value = ex.MaxIter;

            app.ResultsTextArea.Value = {
                'EJEMPLO NEWTON CARGADO'
                ''
                ex.Name
                ''
                ex.Description
                ''
                'Presione "Resolver Newton-Raphson" para ejecutar.'
                };
        end

        function LoadLinearExampleButtonPushed(app, ~)
            examples = app.getLinearExamples();
            idx = find(strcmp({examples.Name}, app.LinearExampleDropDown.Value), 1);

            ex = examples(idx);
            app.MatrixATextArea.Value = ex.A;
            app.VectorBEditField.Value = ex.b;

            app.ResultsTextArea.Value = {
                'EJEMPLO LINEAL CARGADO'
                ''
                ex.Name
                ''
                ex.Description
                ''
                'Presione "Resolver y comparar" para ejecutar.'
                };
        end

        % ==============================================================
        % BOTÓN NEWTON
        % ==============================================================

        function SolveNewtonButtonPushed(app, ~)
            try
                % 1. Leer entradas del usuario
                eqs = app.parseEquationSystem(app.NonlinearSystemTextArea.Value);
                x0 = app.parseVector(app.InitialGuessEditField.Value);
                tol = app.ToleranceEditField.Value;
                maxIter = app.MaxIterEditField.Value;

                % 2. Validaciones básicas
                if isempty(eqs)

                                    app.showError('Debe ingresar al menos una ecuación no lineal.');
                    return;
                end

                if isempty(x0)
                    app.showError('Debe ingresar un vector inicial válido. Ejemplo: [1; 1] o [1; 1; 1].');
                    return;
                end

                if numel(eqs) ~= numel(x0)
                    app.showError(['El número de ecuaciones debe coincidir con el número de variables.' newline ...
                                   'Ejemplo: 2 ecuaciones requieren vector inicial de 2 valores.']);
                    return;
                end

                if tol <= 0
                    app.showError('La tolerancia debe ser un número positivo.');
                    return;
                end

                if maxIter <= 0 || floor(maxIter) ~= maxIter
                    app.showError('El máximo de iteraciones debe ser un entero positivo.');
                    return;
                end

                % 3. Crear función anónima del sistema
                % Esta función recibe un vector x y devuelve F(x).
                % Ejemplo:
                % x = [2;3]
                % fun(x) evalúa todas las ecuaciones usando x=2, y=3.
                fun = @(x) app.evaluateSystem(eqs, x);

                % 4. Ejecutar Newton-Raphson multivariable
                [root, iterations, converged, tableData, colNames, history] = ...
    app.newtonMultivariable(fun, x0, tol, maxIter);

                % 5. Calcular residuo final
                Froot = fun(root);
                residual = norm(Froot, inf);

                % 6. Mostrar tabla de iteraciones
                app.StepsTable.Data = tableData;
                app.StepsTable.ColumnName = colNames;

                % 7. Preparar mensaje de resultado
                if converged
                    statusText = 'CONVERGIÓ EXITOSAMENTE';
                    statusColor = app.AccentGreen;
                else
                    statusText = 'NO CONVERGIÓ EN EL MÁXIMO DE ITERACIONES';
                    statusColor = app.AccentRed;
                end

                app.SummaryLabel.Text = ['Newton-Raphson: ' statusText];
                app.SummaryLabel.FontColor = statusColor;

                app.ResultsTextArea.Value = {
                    'RESULTADO - NEWTON-RAPHSON MULTIVARIABLE'
                    ''
                    ['Estado: ' statusText]
                    ['Iteraciones realizadas: ' num2str(iterations)]
                    ['Raíz aproximada: ' app.formatVector(root)]
                    ['Residuo infinito ||F(x)||∞: ' num2str(residual, '%.6e')]
                    ''
                    'Interpretación:'
                    '- Si el residuo es pequeño, la solución encontrada satisface bien el sistema.'
                    '- Si no converge, pruebe con otro vector inicial o aumente iteraciones.'
                    ''
                    'Dato para defensa:'
                    'El método usa Jacobiana numérica por diferencias finitas centradas.'
                    };

                % 8. Graficar sistema no lineal
                app.plotNonlinearSystem(eqs, root, x0, history);

            catch ME
                app.showError(['Error al resolver Newton-Raphson:' newline ME.message]);
            end
        end


        % ==============================================================
        % BOTÓN SISTEMAS LINEALES
        % ==============================================================
        % Este botón:
        % 1. Lee la matriz A.
        % 2. Lee el vector b.
        % 3. Valida dimensiones.
        % 4. Resuelve Ax=b por Gauss-Jordan.
        % 5. Resuelve Ax=b por factorización LU.
        % 6. Compara ambas soluciones.
        % 7. Grafica rectas o planos si el sistema es 2x2 o 3x3.
        % ==============================================================

        function SolveLinearButtonPushed(app, ~)
            try
                % 1. Leer matriz y vector desde la interfaz
                A = app.parseMatrix(app.MatrixATextArea.Value);
                b = app.parseVector(app.VectorBEditField.Value);

                % 2. Validaciones
                if isempty(A)
                    app.showError('Debe ingresar una matriz A válida.');
                    return;
                end

                if isempty(b)
                    app.showError('Debe ingresar un vector b válido.');
                    return;
                end

                if size(A, 1) ~= size(A, 2)
                    app.showError('La matriz A debe ser cuadrada para resolver Ax=b.');
                    return;
                end

                if length(b) ~= size(A, 1)
                    app.showError('El tamaño del vector b debe coincidir con el número de filas de A.');
                    return;
                end

                if any(~isfinite(A), 'all') || any(~isfinite(b))
                    app.showError('La matriz A y el vector b solo deben contener números finitos.');
                    return;
                end

                % 3. Revisar condición de la matriz
                % rcond(A) cercano a cero indica matriz singular o mal condicionada.
                conditionWarning = '';
                if rcond(A) < 1e-14
                    conditionWarning = ['Advertencia: la matriz es singular o casi singular.' newline ...
                                        'Los resultados pueden no ser confiables.'];
                end

                % 4. Resolver por Gauss-Jordan
                [xGJ, gjSteps] = app.gaussJordan(A, b);

                % 5. Resolver por LU
                [xLU, L, U, P] = app.solveLU(A, b);

                % 6. Comparar resultados
                residualGJ = norm(A*xGJ - b(:), inf);
                residualLU = norm(A*xLU - b(:), inf);
                difference = norm(xGJ - xLU, inf);

                % 7. Tabla de pasos / comparación
                app.StepsTable.ColumnName = {'Método', 'Resultado'};
                app.StepsTable.Data = {
                    'Solución Gauss-Jordan', app.formatVector(xGJ)
                    'Residuo Gauss-Jordan', num2str(residualGJ, '%.6e')
                    'Solución LU', app.formatVector(xLU)
                    'Residuo LU', num2str(residualLU, '%.6e')
                    'Diferencia entre métodos', num2str(difference, '%.6e')
                    'Pasos Gauss-Jordan', gjSteps
                    };

                % 8. Mostrar resultados
                if isempty(conditionWarning)
                    app.SummaryLabel.Text = 'Sistema lineal resuelto correctamente';
                    app.SummaryLabel.FontColor = app.AccentGreen;
                else
                    app.SummaryLabel.Text = 'Sistema lineal con advertencia numérica';
                    app.SummaryLabel.FontColor = app.AccentRed;
                end

                resultLines = {
                    'RESULTADO - SISTEMA DE ECUACIONES LINEALES'
                    ''
                    'Modelo matemático:'
                    'A*x = b'
                    ''
                    'Solución por Gauss-Jordan:'
                    app.formatVector(xGJ)
                    ''
                    'Solución por LU:'
                    app.formatVector(xLU)
                    ''
                    ['Residuo Gauss-Jordan ||Ax-b||∞: ' num2str(residualGJ, '%.6e')]
                    ['Residuo LU ||Ax-b||∞: ' num2str(residualLU, '%.6e')]
                    ['Diferencia entre soluciones: ' num2str(difference, '%.6e')]
                    ''
                    'Matrices de la factorización LU:'
                    'L ='
                    app.formatMatrix(L)
                    ''
                    'U ='
                    app.formatMatrix(U)
                    ''
                    'P ='
                    app.formatMatrix(P)
                    };

                if ~isempty(conditionWarning)
                    resultLines = [
                        resultLines
                        {''}
                        {'ADVERTENCIA:'}
                        {conditionWarning}
                        ];
                end

                resultLines = [
                    resultLines
                    {''}
                    {'Dato para defensa:'}
                    {'Gauss-Jordan transforma [A b] hasta [I x].'}
                    {'LU usa P*A = L*U y resuelve dos sistemas triangulares.'}
                    ];

                app.ResultsTextArea.Value = resultLines;

                % 9. Graficar sistema lineal
                app.plotLinearSystem(A, b, xGJ);

            catch ME
                app.showError(['Error al resolver el sistema lineal:' newline ME.message]);
            end
        end


        % ==============================================================
        % NEWTON-RAPHSON MULTIVARIABLE
        % ==============================================================
        % Idea principal:
        %
        % Para resolver F(x)=0:
        %
        % J(xk)*delta = -F(xk)
        % x(k+1) = xk + delta
        %
        % Donde:
        % - F(x) es el sistema de ecuaciones.
        % - J(x) es la matriz Jacobiana.
        % - delta es la corrección que se suma al punto actual.
        % ==============================================================

        function [root, iterations, converged, tableData, colNames, history] = ...
        newtonMultivariable(app, fun, x0, tol, maxIter)

            x = x0(:);
            converged = false;
            iterations = 0;
            history = x;

            colNames = {'Iteración', 'x actual', 'F(x)', '||delta||∞', 'Error relativo', 'Residuo'};
            tableData = {};





            for k = 1:maxIter

                % 1. Evaluar el sistema en el punto actual
                F = fun(x);

                % 2. Calcular la Jacobiana numérica
                J = app.finiteJacobian(fun, x);

                % 3. Verificar si la Jacobiana es resoluble
                if rcond(J) < 1e-14
                    error('La Jacobiana es singular o casi singular. Pruebe con otro vector inicial.');
                end

                % 4. Resolver J*delta = -F
                delta = -J \ F;

                % 5. Actualizar punto
                xNew = x + delta;
                history(:, end+1) = xNew;

                % 6. Calcular criterios de paro
                deltaNorm = norm(delta, inf);
                approximateError = deltaNorm / max(1, norm(xNew, inf));
                residual = norm(fun(xNew), inf);

                % 7. Guardar información en tabla
                tableData(end+1, :) = {
                    k, ...
                    app.formatVector(xNew), ...
                    app.formatVector(fun(xNew)), ...
                    num2str(deltaNorm, '%.6e'), ...
                    num2str(approximateError, '%.6e'), ...
                    num2str(residual, '%.6e')
                    }; %#ok<AGROW>

                % 8. Revisar convergencia
                if approximateError < tol || residual < tol
                    converged = true;
                    iterations = k;
                    x = xNew;
                    break;
                end

                % 9. Avanzar a la siguiente iteración
                x = xNew;
                iterations = k;
            end





            root = x;
        end


        % ==============================================================
        % JACOBIANA NUMÉRICA POR DIFERENCIAS FINITAS CENTRADAS
        % ==============================================================
        % La Jacobiana contiene derivadas parciales.
        %
        % En lugar de derivar a mano, el programa aproxima:
        %
        % dF/dxj ≈ [F(x+h) - F(x-h)] / 2h
        %
        % Esto es útil porque el usuario solo escribe ecuaciones,
        % no derivadas.
        % ==============================================================

        function J = finiteJacobian(app, fun, x) %#ok<INUSL>
            x = x(:);
            n = length(x);

            F0 = fun(x);
            m = length(F0);

            J = zeros(m, n);

            for j = 1:n
                % Paso pequeño adaptado al tamaño de la variable
                h = sqrt(eps) * max(1, abs(x(j)));

                xp = x;
                xm = x;

                xp(j) = xp(j) + h;
                xm(j) = xm(j) - h;

                Fp = fun(xp);
                Fm = fun(xm);

                J(:, j) = (Fp - Fm) / (2*h);
            end
        end


        % ==============================================================
        % GAUSS-JORDAN CON PIVOTEO PARCIAL
        % ==============================================================
        % Transforma la matriz aumentada:
        %
        % [A b]  --->  [I x]
        %
        % Pasos:
        % 1. Buscar el mejor pivote.
        % 2. Intercambiar filas si hace falta.
        % 3. Normalizar fila pivote.
        % 4. Eliminar valores arriba y abajo del pivote.
        % ==============================================================

        function [x, stepsText] = gaussJordan(app, A, b) %#ok<INUSL>
            n = size(A, 1);
            Aug = [A b(:)];

            steps = {};
            steps{end+1} = 'Matriz aumentada inicial [A b].'; %#ok<AGROW>

            for k = 1:n

                % 1. Buscar pivote parcial
                [pivotValue, localIndex] = max(abs(Aug(k:n, k)));
                pivotRow = localIndex + k - 1;

                if pivotValue < 1e-14
                    error('El sistema no tiene solución única porque aparece un pivote cero.');
                end

                % 2. Intercambiar filas si el mejor pivote no está en la fila actual
                if pivotRow ~= k
                    temp = Aug(k, :);
                    Aug(k, :) = Aug(pivotRow, :);
                    Aug(pivotRow, :) = temp;

                    steps{end+1} = ['Intercambio F' num2str(k) ' <-> F' num2str(pivotRow) '.']; %#ok<AGROW>
                end

                % 3. Normalizar fila pivote
                pivot = Aug(k, k);
                Aug(k, :) = Aug(k, :) / pivot;

                steps{end+1} = ['Normalizar F' num2str(k) ' dividiendo entre pivote ' num2str(pivot, '%.6g') '.']; %#ok<AGROW>

                % 4. Eliminar todos los demás elementos de la columna k
                for i = 1:n
                    if i ~= k
                        factor = Aug(i, k);
                        Aug(i, :) = Aug(i, :) - factor * Aug(k, :);

                        if abs(factor) > 1e-14
                            steps{end+1} = ['Eliminar columna ' num2str(k) ...
                                            ' en F' num2str(i) ...
                                            ' usando factor ' num2str(factor, '%.6g') '.']; %#ok<AGROW>
                        end
                    end
                end
            end

            % La solución queda en la última columna
            x = Aug(:, end);

            steps{end+1} = 'Resultado final: [I x].'; %#ok<AGROW>
            stepsText = strjoin(steps, newline);
        end


        % ==============================================================
        % FACTORIZACIÓN LU
        % ==============================================================
        % MATLAB calcula:
        %
        % P*A = L*U
        %
        % Para resolver Ax=b:
        %
        % 1. L*y = P*b
        % 2. U*x = y
        %
        % Esto es eficiente porque L y U son matrices triangulares.
        % ==============================================================

        function [x, L, U, P] = solveLU(app, A, b) %#ok<INUSL>
            [L, U, P] = lu(A);

            % Sustitución hacia adelante
            y = L \ (P*b(:));

            % Sustitución hacia atrás
            x = U \ y;
        end


        % ==============================================================
        % PARSEO DE ECUACIONES NO LINEALES
        % ==============================================================
        % Convierte el texto escrito por el usuario en ecuaciones evaluables.
        %
        % Permite dos formatos:
        %
        % x^2 + y^2 - 25
        %
        % o
        %
        % x^2 + y^2 = 25
        %
        % Si detecta "=", transforma:
        %
        % izquierda = derecha
        %
        % en:
        %
        % izquierda - derecha
        % ==============================================================

        function eqs = parseEquationSystem(app, rawInput) %#ok<INUSL>
            if isstring(rawInput)
                rawInput = cellstr(rawInput);
            end

            if ischar(rawInput)
                rawInput = cellstr(rawInput);
            end

            eqs = {};

            for i = 1:numel(rawInput)
                line = strtrim(string(rawInput{i}));

                if strlength(line) == 0
                    continue;
                end

                if contains(line, "=")
                    parts = split(line, "=");

                    if numel(parts) ~= 2
                        error('Cada ecuación debe tener como máximo un signo igual.');
                    end

                    leftSide = strtrim(parts(1));
                    rightSide = strtrim(parts(2));

                    eq = "(" + leftSide + ")-(" + rightSide + ")";
                else
                    eq = line;
                end

                eqs{end+1, 1} = char(eq); %#ok<AGROW>
            end
        end


        % ==============================================================
        % EVALUAR SISTEMA NO LINEAL
        % ==============================================================
        % Recibe:
        % - eqs: lista de ecuaciones como texto
        % - xvec: vector de valores
        %
        % Asigna automáticamente nombres de variables:
        %
        % xvec(1) -> x
        % xvec(2) -> y
        % xvec(3) -> z
        % xvec(4) -> w
        % etc.
        % ==============================================================

        function F = evaluateSystem(app, eqs, xvec) %#ok<INUSL>
            xvec = xvec(:);
            n = length(xvec);

            variableNames = {'x','y','z','w','v','u','t','q','r','s'};

            if n > numel(variableNames)
                error('El sistema supera el número de variables soportadas por la app.');
            end

            % Asignar variables en el espacio local de esta función
            for i = 1:n
                eval([variableNames{i} ' = xvec(i);']);
            end

            F = zeros(numel(eqs), 1);

            for i = 1:numel(eqs)
                try
                    F(i) = eval(eqs{i});
                catch
                    error(['No se pudo evaluar la ecuación: ' eqs{i} newline ...
                           'Revise nombres de variables, operadores y paréntesis.']);
                end
            end
        end


        % ==============================================================
        % PARSEO DE VECTOR
        % ==============================================================
        % Convierte texto tipo:
        %
        % [1; 2; 3]
        %
        % en vector columna numérico.
        % ==============================================================

        function v = parseVector(app, rawText) %#ok<INUSL>
            try
                if iscell(rawText)
                    rawText = strjoin(rawText, newline);
                end

                if isstring(rawText)
                    rawText = char(rawText);
                end

                v = eval(rawText);
                v = v(:);

                if ~isnumeric(v) || isempty(v)
                    error('Vector inválido.');
                end

                if any(~isfinite(v))
                    error('El vector contiene valores no finitos.');
                end

            catch
                error('Formato de vector inválido. Use por ejemplo: [1; 2; 3]');
            end
        end


        % ==============================================================
        % PARSEO DE MATRIZ
        % ==============================================================
        % Convierte texto tipo:
        %
        % [1 2 3;
        %  4 5 6;
        %  7 8 9]
        %
        % en matriz numérica.
        % ==============================================================

        function A = parseMatrix(app, rawText) %#ok<INUSL>
            try
                if iscell(rawText)
                    rawText = strjoin(rawText, newline);
                end

                if isstring(rawText)
                    rawText = char(rawText);
                end

                A = eval(rawText);

                if ~isnumeric(A) || isempty(A)
                    error('Matriz inválida.');
                end

                if any(~isfinite(A), 'all')
                    error('La matriz contiene valores no finitos.');
                end

            catch
                error(['Formato de matriz inválido.' newline ...
                       'Use por ejemplo:' newline ...
                       '[1 2; 3 4]']);
            end
        end


        % ==============================================================
        % FORMATO DE VECTOR PARA MOSTRAR EN RESULTADOS
        % ==============================================================

        function txt = formatVector(app, v) %#ok<INUSL>
            v = v(:);
            parts = strings(length(v), 1);

            for i = 1:length(v)
                parts(i) = sprintf('x%d = %.10g', i, v(i));
            end

            txt = char(strjoin(parts, ', '));
        end


        % ==============================================================
        % FORMATO DE MATRIZ PARA MOSTRAR EN RESULTADOS
        % ==============================================================

        function txt = formatMatrix(app, M) %#ok<INUSL>
            txt = evalc('disp(M)');
            txt = strtrim(txt);
        end


        % ==============================================================
        % GRAFICAR SISTEMA NO LINEAL
        % ==============================================================
        % Si hay 2 variables:
        % - Grafica curvas implícitas f(x,y)=0.
        %
        % Si hay 3 variables:
        % - Grafica superficies implícitas f(x,y,z)=0.
        %
        % Además:
        % - Marca el punto inicial.
        % - Marca la raíz encontrada.
        % ==============================================================

        function plotNonlinearSystem(app, eqs, root, x0, history)
            cla(app.MainAxes);
            hold(app.MainAxes, 'on');
            grid(app.MainAxes, 'on');

            app.MainAxes.Color = [0.02 0.025 0.035];
            app.MainAxes.XColor = app.TextColor;
            app.MainAxes.YColor = app.TextColor;
            app.MainAxes.ZColor = app.TextColor;
            app.MainAxes.GridColor = [0.35 0.45 0.65];
            app.MainAxes.MinorGridColor = [0.20 0.25 0.35];

            n = length(root);
            colors = [
                0.10 0.75 0.95
                0.95 0.25 0.55
                0.30 0.95 0.45
                0.90 0.80 0.20
                ];

            try
                if n == 2
                    % Rango centrado entre punto inicial y raíz
                    center = (root(:) + x0(:)) / 2;
                    span = max(6, 2*norm(root(:)-x0(:), inf) + 4);

                    xrange = [center(1)-span center(1)+span];
                    yrange = [center(2)-span center(2)+span];

                    for i = 1:numel(eqs)
                        expr = vectorize(eqs{i});
                        fh = str2func(['@(x,y)' expr]);

                        fimplicit(app.MainAxes, fh, [xrange yrange], ...
                            'LineWidth', 2.2, ...
                            'Color', colors(mod(i-1, size(colors, 1))+1, :), ...
                            'DisplayName', ['Ecuación ' num2str(i)]);
                    end

                    % --------------------------------------------------
                    % RECORRIDO PREMIUM DE NEWTON EN 2D
                    % --------------------------------------------------
                    % Este bloque dibuja el camino que siguió Newton:
                    % k=0 es el punto inicial.
                    % k=1, k=2, ... son las iteraciones.
                    % El último punto debe quedar cerca de la raíz.
                    % --------------------------------------------------

                    if exist('history', 'var') && ~isempty(history) && size(history, 1) == 2 && size(history, 2) >= 2

                        % Dibujar línea amarilla del recorrido
                        plot(app.MainAxes, history(1, :), history(2, :), '-o', ...
                            'LineWidth', 2.8, ...
                            'MarkerSize', 7, ...
                            'Color', [1.00 0.78 0.15], ...
                            'MarkerFaceColor', [1.00 0.78 0.15], ...
                            'MarkerEdgeColor', [0.05 0.05 0.05], ...
                            'DisplayName', 'Recorrido Newton');

                        % Etiquetar cada punto con su número de iteración
                        for kk = 1:size(history, 2)
                            text(app.MainAxes, history(1, kk), history(2, kk), ...
                                ['  k=' num2str(kk-1)], ...
                                'Color', [1.00 0.90 0.35], ...
                                'FontSize', 10, ...
                                'FontWeight', 'bold');
                        end
                    end

                    plot(app.MainAxes, x0(1), x0(2), 'o', ...
                        'MarkerSize', 9, ...
                        'LineWidth', 2, ...
                        'Color', [1 1 1], ...
                        'MarkerFaceColor', app.AccentPurple, ...
                        'DisplayName', 'Punto inicial');

                    plot(app.MainAxes, root(1), root(2), 'p', ...
                        'MarkerSize', 15, ...
                        'LineWidth', 2.5, ...
                        'Color', [1 1 1], ...
                        'MarkerFaceColor', app.AccentGreen, ...
                        'DisplayName', 'Raíz encontrada');

                    title(app.MainAxes, 'Newton-Raphson 2D: Intersección de curvas', ...
                        'Color', app.TextColor, 'FontWeight', 'bold');

                    xlabel(app.MainAxes, 'x');
                    ylabel(app.MainAxes, 'y');
                    legend(app.MainAxes, 'Location', 'best', 'TextColor', app.TextColor);

                    axis(app.MainAxes, 'equal');

                elseif n == 3
                    % Rango 3D centrado
                    center = (root(:) + x0(:)) / 2;
                  span = max(3.2, norm(root(:)-x0(:), inf) + 2.6);

                    range = [
                        center(1)-span center(1)+span
                        center(2)-span center(2)+span
                        center(3)-span center(3)+span
                        ];

                    for i = 1:min(numel(eqs), 3)
                        expr = vectorize(eqs{i});
                        fh = str2func(['@(x,y,z)' expr]);

                        h = fimplicit3(app.MainAxes, fh, ...
                            [range(1,:) range(2,:) range(3,:)], ...
                            'FaceAlpha', 0.22, ...
                            'EdgeColor', 'none', ...
                            'FaceColor', colors(mod(i-1, size(colors, 1))+1, :), ...
                            'DisplayName', ['Superficie ' num2str(i)]);

                        try
                            h.MeshDensity = 35;
                        catch
                        end
                    end

                    % --------------------------------------------------
                    % RECORRIDO PREMIUM DE NEWTON EN 3D
                    % --------------------------------------------------
                    % Este bloque dibuja el camino espacial que siguió
                    % Newton-Raphson desde el punto inicial hasta la raíz.
                    %
                    % history(:,1) = k=0, punto inicial
                    % history(:,2) = k=1
                    % history(:,3) = k=2
                    % etc.
                    % --------------------------------------------------

                    if exist('history', 'var') && ~isempty(history) && size(history, 1) == 3 && size(history, 2) >= 2

                        % Dibujar línea amarilla del recorrido en 3D
                        plot3(app.MainAxes, history(1, :), history(2, :), history(3, :), '-o', ...
                            'LineWidth', 4.2, ...
                             'MarkerSize', 10, ...
                            'Color', [1.00 0.78 0.15], ...
                            'MarkerFaceColor', [1.00 0.78 0.15], ...
                            'MarkerEdgeColor', [0.05 0.05 0.05], ...
                            'DisplayName', 'Recorrido Newton');

                        % Etiquetar cada punto con su número de iteración
                        for kk = 1:size(history, 2)
                            text(app.MainAxes, history(1, kk), history(2, kk), history(3, kk), ...
                                ['  k=' num2str(kk-1)], ...
                                'Color', [1.00 0.90 0.35], ...
                                'FontSize', 12, ...
                                'FontWeight', 'bold');
                        end
                    end

                    plot3(app.MainAxes, x0(1), x0(2), x0(3), 'o', ...
                        'MarkerSize', 10, ...
                        'LineWidth', 2, ...
                        'Color', [1 1 1], ...
                        'MarkerFaceColor', app.AccentPurple, ...
                        'DisplayName', 'Punto inicial');

                    plot3(app.MainAxes, root(1), root(2), root(3), 'p', ...
                        'MarkerSize', 18, ...
                        'LineWidth', 2.5, ...
                        'Color', [1 1 1], ...
                        'MarkerFaceColor', app.AccentGreen, ...
                        'DisplayName', 'Raíz encontrada');

                    title(app.MainAxes, 'Newton-Raphson 3D: Intersección de superficies', ...
                        'Color', app.TextColor, 'FontWeight', 'bold');

                    xlabel(app.MainAxes, 'x');
                    ylabel(app.MainAxes, 'y');
                    zlabel(app.MainAxes, 'z');

                    % Vista 3D premium: cámara más cercana e inclinada
view(app.MainAxes, [-38 24]);

% Mantiene la proporción visual de la escena
axis(app.MainAxes, 'vis3d');
pbaspect(app.MainAxes, [1.5 1 0.75]);

% Iluminación suave para que las superficies se vean más profesionales
camlight(app.MainAxes, 'headlight');
lighting(app.MainAxes, 'gouraud');

% Zoom visual para que el recorrido no se vea tan pequeño
try
    camzoom(app.MainAxes, 1.25);
catch
end

legend(app.MainAxes, 'Location', 'northeast', 'TextColor', app.TextColor);

                else
                    text(app.MainAxes, 0.5, 0.5, ...
                        'La visualización solo está disponible para sistemas de 2 o 3 variables.', ...
                        'Units', 'normalized', ...
                        'HorizontalAlignment', 'center', ...
                        'Color', app.TextColor, ...
                        'FontSize', 14, ...
                        'FontWeight', 'bold');

                    title(app.MainAxes, 'Sistema no graficable', 'Color', app.TextColor);
                end

            catch ME
                cla(app.MainAxes);
                text(app.MainAxes, 0.5, 0.5, ...
                    ['No se pudo generar la gráfica.' newline ME.message], ...
                    'Units', 'normalized', ...
                    'HorizontalAlignment', 'center', ...
                    'Color', app.AccentRed, ...
                    'FontSize', 13, ...
                    'FontWeight', 'bold');
            end

            hold(app.MainAxes, 'off');
        end


        % ==============================================================
        % GRAFICAR SISTEMA LINEAL
        % ==============================================================
        % Si A es 2x2:
        % - Grafica dos rectas.
        %
        % Si A es 3x3:
        % - Grafica tres planos.
        %
        % Si el sistema tiene más variables:
        % - Muestra mensaje educativo.
        % ==============================================================

        function plotLinearSystem(app, A, b, solution)
            cla(app.MainAxes);
            hold(app.MainAxes, 'on');
            grid(app.MainAxes, 'on');

            app.MainAxes.Color = [0.02 0.025 0.035];
            app.MainAxes.XColor = app.TextColor;
            app.MainAxes.YColor = app.TextColor;
            app.MainAxes.ZColor = app.TextColor;
            app.MainAxes.GridColor = [0.35 0.45 0.65];

            n = size(A, 1);

            colors = [
                0.10 0.75 0.95
                0.95 0.25 0.55
                0.30 0.95 0.45
                ];

            try
                if n == 2
                    xsol = solution(1);
                    ysol = solution(2);

                    span = max(6, norm(solution, inf) + 4);
                    xvals = linspace(xsol-span, xsol+span, 400);

                    for i = 1:2
                        if abs(A(i, 2)) > 1e-14
                            yvals = (b(i) - A(i, 1)*xvals) / A(i, 2);

                            plot(app.MainAxes, xvals, yvals, ...
                                'LineWidth', 2.5, ...
                                'Color', colors(i, :), ...
                                'DisplayName', ['Recta ' num2str(i)]);
                        else
                            xline(app.MainAxes, b(i)/A(i,1), ...
                                'LineWidth', 2.5, ...
                                'Color', colors(i, :), ...
                                'DisplayName', ['Recta ' num2str(i)]);
                        end
                    end

                    plot(app.MainAxes, xsol, ysol, 'p', ...
                        'MarkerSize', 16, ...
                        'LineWidth', 2.5, ...
                        'Color', [1 1 1], ...
                        'MarkerFaceColor', app.AccentGreen, ...
                        'DisplayName', 'Solución');

                    title(app.MainAxes, 'Sistema lineal 2D: Intersección de rectas', ...
                        'Color', app.TextColor, 'FontWeight', 'bold');

                    xlabel(app.MainAxes, 'x_1');
                    ylabel(app.MainAxes, 'x_2');
                    legend(app.MainAxes, 'Location', 'best', 'TextColor', app.TextColor);
                    axis(app.MainAxes, 'equal');

                elseif n == 3
                    xsol = solution(1);
                    ysol = solution(2);
                    zsol = solution(3);

                    span = max(4, norm(solution, inf) + 3);

                    [X, Y] = meshgrid( ...
                        linspace(xsol-span, xsol+span, 35), ...
                        linspace(ysol-span, ysol+span, 35));

                    for i = 1:3
                        if abs(A(i, 3)) > 1e-14
                            Z = (b(i) - A(i,1)*X - A(i,2)*Y) / A(i,3);

                            surf(app.MainAxes, X, Y, Z, ...
                                'FaceAlpha', 0.24, ...
                                'EdgeColor', 'none', ...
                                'FaceColor', colors(i, :), ...
                                'DisplayName', ['Plano ' num2str(i)]);
                        end
                    end

                    plot3(app.MainAxes, xsol, ysol, zsol, 'p', ...
                        'MarkerSize', 18, ...
                        'LineWidth', 2.5, ...
                        'Color', [1 1 1], ...
                        'MarkerFaceColor', app.AccentGreen, ...
                        'DisplayName', 'Solución');

                    title(app.MainAxes, 'Sistema lineal 3D: Intersección de planos', ...
                        'Color', app.TextColor, 'FontWeight', 'bold');

                    xlabel(app.MainAxes, 'x_1');
                    ylabel(app.MainAxes, 'x_2');
                    zlabel(app.MainAxes, 'x_3');

                    view(app.MainAxes, 3);
                    camlight(app.MainAxes, 'headlight');
                    lighting(app.MainAxes, 'gouraud');
                    legend(app.MainAxes, 'Location', 'best', 'TextColor', app.TextColor);

                else
                    text(app.MainAxes, 0.5, 0.5, ...
                        ['Sistema de ' num2str(n) ' variables resuelto correctamente.' newline ...
                         'La visualización geométrica directa solo se muestra para 2x2 o 3x3.'], ...
                        'Units', 'normalized', ...
                        'HorizontalAlignment', 'center', ...
                        'Color', app.TextColor, ...
                        'FontSize', 14, ...
                        'FontWeight', 'bold');

                    title(app.MainAxes, 'Sistema resuelto sin visualización geométrica', ...
                        'Color', app.TextColor);
                end

            catch ME
                cla(app.MainAxes);
                text(app.MainAxes, 0.5, 0.5, ...
                    ['No se pudo generar la gráfica.' newline ME.message], ...
                    'Units', 'normalized', ...
                    'HorizontalAlignment', 'center', ...
                    'Color', app.AccentRed, ...
                    'FontSize', 13, ...
                    'FontWeight', 'bold');
            end

            hold(app.MainAxes, 'off');
        end


        % ==============================================================
        % BOTONES DE AYUDA / BURBUJITAS
        % ==============================================================
        % Estos botones muestran mensajes cortos para usuarios que no saben
        % cómo ingresar los datos.
        % ==============================================================

        function NonlinearHelpButtonPushed(app, ~)
            uialert(app.UIFigure, ...
                ['CÓMO INGRESAR ECUACIONES NO LINEALES' newline newline ...
                 '1. Escriba una ecuación por línea.' newline ...
                 '2. Puede escribirlas igualadas a cero:' newline ...
                 '   x^2 + y^2 - 25' newline newline ...
                 '3. También puede usar signo igual:' newline ...
                 '   x^2 + y^2 = 25' newline newline ...
                 '4. Variables permitidas:' newline ...
                 '   x, y, z, w, v, u...' newline newline ...
                 '5. Funciones permitidas:' newline ...
                 '   sin(x), cos(x), exp(x), log(x), sqrt(x)' newline newline ...
                 'Ejemplo 3D:' newline ...
                 '   x^2 + y^2 + z^2 - 9' newline ...
                 '   x + y + z - 3' newline ...
                 '   x - y + z - 1'], ...
                'Ayuda - Newton-Raphson', ...
                'Icon', 'info');
        end

        function MatrixHelpButtonPushed(app, ~)
            uialert(app.UIFigure, ...
                ['CÓMO INGRESAR SISTEMAS LINEALES' newline newline ...
                 'El sistema debe tener la forma:' newline ...
                 '   A*x = b' newline newline ...
                 'Matriz A ejemplo:' newline ...
                 '   [4 -1 0;' newline ...
                 '    -1 4 -1;' newline ...
                 '     0 -1 3]' newline newline ...
                 'Vector b ejemplo:' newline ...
                 '   [15; 10; 10]' newline newline ...
                 'Notas:' newline ...
                 '- A debe ser cuadrada.' newline ...
                 '- b debe tener el mismo número de filas que A.' newline ...
                 '- Para graficar en 3D use sistemas 3x3.'], ...
                'Ayuda - Sistemas Lineales', ...
                'Icon', 'info');
        end

        function HelpButtonPushed(app, ~)
            uialert(app.UIFigure, ...
                ['GUÍA RÁPIDA DEL SISTEMA' newline newline ...
                 'NEWTON-RAPHSON:' newline ...
                 '1. Seleccione un ejemplo o escriba sus ecuaciones.' newline ...
                 '2. Ingrese un vector inicial.' newline ...
                 '3. Defina tolerancia e iteraciones.' newline ...
                 '4. Presione Resolver.' newline newline ...
                 'SISTEMAS LINEALES:' newline ...
                 '1. Seleccione un ejemplo o escriba A y b.' newline ...
                 '2. Presione Resolver y comparar.' newline ...
                 '3. El sistema compara Gauss-Jordan contra LU.' newline newline ...
                 'DEFENSA ORAL:' newline ...
                 '- Newton usa Jacobiana numérica.' newline ...
                 '- Gauss-Jordan reduce [A b] hasta [I x].' newline ...
                 '- LU factoriza P*A = L*U.'], ...
                'Ayuda general', ...
                'Icon', 'info');
        end


        % ==============================================================
        % LIMPIAR
        % ==============================================================

        function ClearButtonPushed(app, ~)
            app.NonlinearSystemTextArea.Value = {};
            app.InitialGuessEditField.Value = '';
            app.ToleranceEditField.Value = 1e-6;
            app.MaxIterEditField.Value = 50;

            app.MatrixATextArea.Value = {};
            app.VectorBEditField.Value = '';

            app.ResultsTextArea.Value = {
                'Campos limpiados.'
                ''
                'Puede cargar un ejemplo o ingresar sus propios datos.'
                };

            app.StepsTable.Data = {};
            app.StepsTable.ColumnName = {'Estado', 'Información'};

            app.SummaryLabel.Text = 'Esperando datos...';
            app.SummaryLabel.FontColor = app.TextColor;

            cla(app.MainAxes);
            title(app.MainAxes, 'Visualización dinámica 2D / 3D', 'Color', app.TextColor);
            xlabel(app.MainAxes, 'x');
            ylabel(app.MainAxes, 'y');
            zlabel(app.MainAxes, 'z');
            grid(app.MainAxes, 'on');
        end


        % ==============================================================
        % BOTÓN DE INICIO
        % ==============================================================

        function HomeStartButtonPushed(app, ~)
            app.Tabs.SelectedTab = app.NewtonTab;

            app.ResultsTextArea.Value = {
                'Inicio rápido'
                ''
                'Seleccione un ejemplo de Newton o escriba su propio sistema.'
                ''
                'Recomendación: pruebe primero el ejemplo 3D de esfera y planos.'
                };
        end


        % ==============================================================
        % MENSAJES DE ERROR
        % ==============================================================

        function showError(app, message)
            app.SummaryLabel.Text = 'Error detectado';
            app.SummaryLabel.FontColor = app.AccentRed;

            app.ResultsTextArea.Value = {
                'ERROR'
                ''
                message
                ''
                'Revise los datos ingresados o utilice un ejemplo precargado.'
                };

            uialert(app.UIFigure, message, 'Error', 'Icon', 'error');
        end    






                % ==============================================================
        % CREACIÓN COMPLETA DE LA INTERFAZ GRÁFICA
        % ==============================================================
        % Esta función construye toda la app:
        %
        % - Ventana principal
        % - Panel izquierdo de controles
        % - Pestaña de inicio
        % - Pestaña Newton-Raphson
        % - Pestaña sistemas lineales
        % - Panel derecho con gráfica
        % - Área de resultados
        % - Tabla de iteraciones / comparación
        %
        % La idea visual es tipo dashboard profesional:
        % fondo oscuro, colores neón, botones grandes y secciones claras.
        % ==============================================================

        function createComponents(app)

            % ----------------------------------------------------------
            % VENTANA PRINCIPAL
            % ----------------------------------------------------------
            % Se crea invisible primero para evitar parpadeos mientras
            % se agregan todos los componentes.
            % ----------------------------------------------------------

            app.UIFigure = uifigure('Visible', 'off');
            app.UIFigure.Name = 'Métodos Numéricos Premium App - Grupo 6';
            app.UIFigure.Position = [100 80 1400 780];
            app.UIFigure.Color = app.DarkBackground;

            % ----------------------------------------------------------
            % LAYOUT PRINCIPAL
            % ----------------------------------------------------------
            % Divide la ventana en dos zonas:
            %
            % Columna izquierda:
            % - Menú
            % - Entradas
            % - Botones
            %
            % Columna derecha:
            % - Gráfica
            % - Resultados
            % - Tabla
            % ----------------------------------------------------------

            app.MainGrid = uigridlayout(app.UIFigure);
            app.MainGrid.RowHeight = {'1x'};
            app.MainGrid.ColumnWidth = {390, '1x'};
            app.MainGrid.Padding = [14 14 14 14];
            app.MainGrid.ColumnSpacing = 14;
            app.MainGrid.BackgroundColor = app.DarkBackground;

            % ==========================================================
            % PANEL IZQUIERDO
            % ==========================================================

            app.LeftPanel = uipanel(app.MainGrid);
            app.LeftPanel.Layout.Row = 1;
            app.LeftPanel.Layout.Column = 1;
            app.LeftPanel.BackgroundColor = app.PanelBackground;
            app.LeftPanel.BorderType = 'none';

            app.LeftGrid = uigridlayout(app.LeftPanel);
            app.LeftGrid.RowHeight = {48, 26, '1x', 38, 38};
            app.LeftGrid.ColumnWidth = {'1x'};
            app.LeftGrid.Padding = [12 12 12 12];
            app.LeftGrid.RowSpacing = 7;
            app.LeftGrid.BackgroundColor = app.PanelBackground;

            % ----------------------------------------------------------
            % TÍTULO PRINCIPAL
            % ----------------------------------------------------------

            app.TitleLabel = uilabel(app.LeftGrid);
            app.TitleLabel.Layout.Row = 1;
            app.TitleLabel.Layout.Column = 1;
            app.TitleLabel.Text = 'MÉTODOS NUMÉRICOS';
            app.TitleLabel.FontSize = 22;
            app.TitleLabel.FontWeight = 'bold';
            app.TitleLabel.FontColor = app.TextColor;
            app.TitleLabel.HorizontalAlignment = 'center';

            app.SubtitleLabel = uilabel(app.LeftGrid);
            app.SubtitleLabel.Layout.Row = 2;
            app.SubtitleLabel.Layout.Column = 1;
            app.SubtitleLabel.Text = 'Grupo 6 | Newton vs Sistemas Lineales';
            app.SubtitleLabel.FontSize = 12;
            app.SubtitleLabel.FontColor = app.AccentCyan;
            app.SubtitleLabel.HorizontalAlignment = 'center';

            % ==========================================================
            % TABGROUP PRINCIPAL
            % ==========================================================

            app.Tabs = uitabgroup(app.LeftGrid);
            app.Tabs.Layout.Row = 3;
            app.Tabs.Layout.Column = 1;

            % ==========================================================
            % PESTAÑA HOME / INICIO
            % ==========================================================

            app.HomeTab = uitab(app.Tabs);
            app.HomeTab.Title = 'Inicio';
            app.HomeTab.BackgroundColor = app.PanelBackground;

            app.HomeGrid = uigridlayout(app.HomeTab);
            app.HomeGrid.RowHeight = {60, 45, '1x', 48};
            app.HomeGrid.ColumnWidth = {'1x'};
            app.HomeGrid.Padding = [14 14 14 14];
            app.HomeGrid.RowSpacing = 12;
            app.HomeGrid.BackgroundColor = app.PanelBackground;

            app.HomeTitle = uilabel(app.HomeGrid);
            app.HomeTitle.Layout.Row = 1;
            app.HomeTitle.Layout.Column = 1;
            app.HomeTitle.Text = 'Dashboard Académico';
            app.HomeTitle.FontSize = 22;
            app.HomeTitle.FontWeight = 'bold';
            app.HomeTitle.FontColor = app.TextColor;
            app.HomeTitle.HorizontalAlignment = 'center';

            app.HomeSubtitle = uilabel(app.HomeGrid);
            app.HomeSubtitle.Layout.Row = 2;
            app.HomeSubtitle.Layout.Column = 1;
            app.HomeSubtitle.Text = 'Resolución visual e interactiva de métodos numéricos';
            app.HomeSubtitle.FontSize = 13;
            app.HomeSubtitle.FontColor = app.MutedTextColor;
            app.HomeSubtitle.HorizontalAlignment = 'center';

            app.HomeText = uitextarea(app.HomeGrid);
            app.HomeText.Layout.Row = 3;
            app.HomeText.Layout.Column = 1;
            app.HomeText.Editable = 'off';
            app.HomeText.FontSize = 14;
            app.HomeText.FontColor = app.TextColor;
            app.HomeText.BackgroundColor = app.CardBackground;
            app.HomeText.Value = {
                'BIENVENIDO AL SISTEMA'
                ''
                'Este proyecto integra dos bloques importantes de Métodos Numéricos:'
                ''
                '1) Newton-Raphson Multivariable'
                '   - Resuelve sistemas no lineales.'
                '   - Usa Jacobiana numérica.'
                '   - Grafica curvas 2D o superficies 3D.'
                ''
                '2) Sistemas de Ecuaciones Lineales'
                '   - Resuelve Ax = b.'
                '   - Compara Gauss-Jordan contra LU.'
                '   - Grafica rectas o planos cuando es posible.'
                ''
                'Use los ejemplos precargados para demostrar rápidamente el sistema.'
                ''
                'Consejo para exposición:'
                'Pruebe el ejemplo 3D de Newton o el ejemplo de planos 3D en sistemas lineales.'
                };

            app.HomeStartButton = uibutton(app.HomeGrid, 'push');
            app.HomeStartButton.Layout.Row = 4;
            app.HomeStartButton.Layout.Column = 1;
            app.HomeStartButton.Text = 'Comenzar con Newton-Raphson';
            app.HomeStartButton.FontSize = 14;
            app.HomeStartButton.FontWeight = 'bold';
            app.HomeStartButton.FontColor = [1 1 1];
            app.HomeStartButton.BackgroundColor = app.AccentBlue;
            app.HomeStartButton.ButtonPushedFcn = createCallbackFcn(app, @HomeStartButtonPushed, true);
            app.HomeStartButton.Tooltip = 'Ir directamente al método Newton-Raphson Multivariable';

            % ==========================================================
            % PESTAÑA NEWTON-RAPHSON
            % ==========================================================

            app.NewtonTab = uitab(app.Tabs);
            app.NewtonTab.Title = 'Newton';
            app.NewtonTab.BackgroundColor = app.PanelBackground;

            app.NewtonGrid = uigridlayout(app.NewtonTab);
            app.NewtonGrid.RowHeight = {22, 32, 22, 105, 22, 30, 22, 30, 22, 30, 38};
            app.NewtonGrid.ColumnWidth = {'1x', 34};
            app.NewtonGrid.Padding = [10 10 10 10];
            app.NewtonGrid.RowSpacing = 5;
            app.NewtonGrid.ColumnSpacing = 6;
            app.NewtonGrid.BackgroundColor = app.PanelBackground;

            % ----------------------------------------------------------
            % Selector de ejemplos Newton
            % ----------------------------------------------------------

            app.NewtonExampleLabel = uilabel(app.NewtonGrid);
            app.NewtonExampleLabel.Layout.Row = 1;
            app.NewtonExampleLabel.Layout.Column = [1 2];
            app.NewtonExampleLabel.Text = 'Biblioteca de ejemplos Newton';
            app.NewtonExampleLabel.FontSize = 13;
            app.NewtonExampleLabel.FontWeight = 'bold';
            app.NewtonExampleLabel.FontColor = app.AccentCyan;

            app.NewtonExampleDropDown = uidropdown(app.NewtonGrid);
            app.NewtonExampleDropDown.Layout.Row = 2;
            app.NewtonExampleDropDown.Layout.Column = 1;
            app.NewtonExampleDropDown.FontSize = 12;
            app.NewtonExampleDropDown.BackgroundColor = [1 1 1];
            app.NewtonExampleDropDown.Tooltip = 'Seleccione un ejercicio no lineal precargado';

            app.LoadNewtonExampleButton = uibutton(app.NewtonGrid, 'push');
            app.LoadNewtonExampleButton.Layout.Row = 2;
            app.LoadNewtonExampleButton.Layout.Column = 2;
            app.LoadNewtonExampleButton.Text = '↧';
            app.LoadNewtonExampleButton.FontSize = 18;
            app.LoadNewtonExampleButton.FontWeight = 'bold';
            app.LoadNewtonExampleButton.FontColor = [1 1 1];
            app.LoadNewtonExampleButton.BackgroundColor = app.AccentPurple;
            app.LoadNewtonExampleButton.ButtonPushedFcn = createCallbackFcn(app, @LoadNewtonExampleButtonPushed, true);
            app.LoadNewtonExampleButton.Tooltip = 'Cargar el ejemplo seleccionado';

            % ----------------------------------------------------------
            % Área de ecuaciones no lineales
            % ----------------------------------------------------------

            app.NonlinearSystemLabel = uilabel(app.NewtonGrid);
            app.NonlinearSystemLabel.Layout.Row = 3;
            app.NonlinearSystemLabel.Layout.Column = 1;
            app.NonlinearSystemLabel.Text = 'Sistema no lineal, una ecuación por línea';
            app.NonlinearSystemLabel.FontSize = 13;
            app.NonlinearSystemLabel.FontWeight = 'bold';
            app.NonlinearSystemLabel.FontColor = app.TextColor;

            app.NonlinearHelpButton = uibutton(app.NewtonGrid, 'push');
            app.NonlinearHelpButton.Layout.Row = 3;
            app.NonlinearHelpButton.Layout.Column = 2;
            app.NonlinearHelpButton.Text = '?';
            app.NonlinearHelpButton.FontSize = 15;
            app.NonlinearHelpButton.FontWeight = 'bold';
            app.NonlinearHelpButton.FontColor = [1 1 1];
            app.NonlinearHelpButton.BackgroundColor = app.AccentCyan;
            app.NonlinearHelpButton.ButtonPushedFcn = createCallbackFcn(app, @NonlinearHelpButtonPushed, true);
            app.NonlinearHelpButton.Tooltip = 'Ayuda para ingresar ecuaciones no lineales';

            app.NonlinearSystemTextArea = uitextarea(app.NewtonGrid);
            app.NonlinearSystemTextArea.Layout.Row = 4;
            app.NonlinearSystemTextArea.Layout.Column = [1 2];
            app.NonlinearSystemTextArea.FontSize = 13;
            app.NonlinearSystemTextArea.FontName = 'Consolas';
            app.NonlinearSystemTextArea.FontColor = app.TextColor;
            app.NonlinearSystemTextArea.BackgroundColor = app.CardBackground;
            app.NonlinearSystemTextArea.Placeholder = 'Ejemplo: x^2 + y^2 - 25';
            app.NonlinearSystemTextArea.Tooltip = 'Puede usar x, y, z. Escriba una ecuación por línea.';

            % ----------------------------------------------------------
            % Vector inicial
            % ----------------------------------------------------------

            app.InitialGuessLabel = uilabel(app.NewtonGrid);
            app.InitialGuessLabel.Layout.Row = 5;
            app.InitialGuessLabel.Layout.Column = [1 2];
            app.InitialGuessLabel.Text = 'Vector inicial';
            app.InitialGuessLabel.FontSize = 13;
            app.InitialGuessLabel.FontWeight = 'bold';
            app.InitialGuessLabel.FontColor = app.TextColor;

            app.InitialGuessEditField = uieditfield(app.NewtonGrid, 'text');
            app.InitialGuessEditField.Layout.Row = 6;
            app.InitialGuessEditField.Layout.Column = [1 2];
            app.InitialGuessEditField.FontSize = 13;
            app.InitialGuessEditField.FontName = 'Consolas';
            app.InitialGuessEditField.FontColor = app.TextColor;
            app.InitialGuessEditField.BackgroundColor = app.CardBackground;
            app.InitialGuessEditField.Placeholder = '[1; 1] o [1; 1; 1]';
            app.InitialGuessEditField.Tooltip = 'Debe tener la misma cantidad de valores que ecuaciones';

            % ----------------------------------------------------------
            % Tolerancia
            % ----------------------------------------------------------

            app.ToleranceLabel = uilabel(app.NewtonGrid);
            app.ToleranceLabel.Layout.Row = 7;
            app.ToleranceLabel.Layout.Column = [1 2];
            app.ToleranceLabel.Text = 'Tolerancia';
            app.ToleranceLabel.FontSize = 13;
            app.ToleranceLabel.FontWeight = 'bold';
            app.ToleranceLabel.FontColor = app.TextColor;

            app.ToleranceEditField = uieditfield(app.NewtonGrid, 'numeric');
            app.ToleranceEditField.Layout.Row = 8;
            app.ToleranceEditField.Layout.Column = [1 2];
            app.ToleranceEditField.Value = 1e-6;
            app.ToleranceEditField.Limits = [eps Inf];
            app.ToleranceEditField.FontSize = 13;
            app.ToleranceEditField.FontColor = app.TextColor;
            app.ToleranceEditField.BackgroundColor = app.CardBackground;
            app.ToleranceEditField.Tooltip = 'Criterio de parada. Ejemplo recomendado: 1e-6';

            % ----------------------------------------------------------
            % Iteraciones máximas
            % ----------------------------------------------------------

            app.MaxIterLabel = uilabel(app.NewtonGrid);
            app.MaxIterLabel.Layout.Row = 9;
            app.MaxIterLabel.Layout.Column = [1 2];
            app.MaxIterLabel.Text = 'Máximo de iteraciones';
            app.MaxIterLabel.FontSize = 13;
            app.MaxIterLabel.FontWeight = 'bold';
            app.MaxIterLabel.FontColor = app.TextColor;

            app.MaxIterEditField = uieditfield(app.NewtonGrid, 'numeric');
            app.MaxIterEditField.Layout.Row = 10;
            app.MaxIterEditField.Layout.Column = [1 2];
            app.MaxIterEditField.Value = 50;
            app.MaxIterEditField.Limits = [1 Inf];
            app.MaxIterEditField.RoundFractionalValues = 'on';
            app.MaxIterEditField.FontSize = 13;
            app.MaxIterEditField.FontColor = app.TextColor;
            app.MaxIterEditField.BackgroundColor = app.CardBackground;
            app.MaxIterEditField.Tooltip = 'Cantidad máxima de intentos antes de detener el método';

            % ----------------------------------------------------------
            % Botón resolver Newton
            % ----------------------------------------------------------

            app.SolveNewtonButton = uibutton(app.NewtonGrid, 'push');
            app.SolveNewtonButton.Layout.Row = 11;
            app.SolveNewtonButton.Layout.Column = [1 2];
            app.SolveNewtonButton.Text = 'Resolver Newton-Raphson';
            app.SolveNewtonButton.FontSize = 15;
            app.SolveNewtonButton.FontWeight = 'bold';
            app.SolveNewtonButton.FontColor = [1 1 1];
            app.SolveNewtonButton.BackgroundColor = app.AccentGreen;
            app.SolveNewtonButton.ButtonPushedFcn = createCallbackFcn(app, @SolveNewtonButtonPushed, true);
            app.SolveNewtonButton.Tooltip = 'Ejecutar Newton-Raphson multivariable y graficar';

            % ==========================================================
            % PESTAÑA SISTEMAS LINEALES
            % ==========================================================

            app.LinearTab = uitab(app.Tabs);
            app.LinearTab.Title = 'Lineal';
            app.LinearTab.BackgroundColor = app.PanelBackground;

            app.LinearGrid = uigridlayout(app.LinearTab);
            app.LinearGrid.RowHeight = {28, 38, 28, 145, 28, 34, 46, '1x'};
            app.LinearGrid.ColumnWidth = {'1x', 36};
            app.LinearGrid.Padding = [14 14 14 14];
            app.LinearGrid.RowSpacing = 8;
            app.LinearGrid.ColumnSpacing = 8;
            app.LinearGrid.BackgroundColor = app.PanelBackground;

            % ----------------------------------------------------------
            % Selector de ejemplos lineales
            % ----------------------------------------------------------

            app.LinearExampleLabel = uilabel(app.LinearGrid);
            app.LinearExampleLabel.Layout.Row = 1;
            app.LinearExampleLabel.Layout.Column = [1 2];
            app.LinearExampleLabel.Text = 'Biblioteca de ejemplos lineales';
            app.LinearExampleLabel.FontSize = 13;
            app.LinearExampleLabel.FontWeight = 'bold';
            app.LinearExampleLabel.FontColor = app.AccentCyan;

            app.LinearExampleDropDown = uidropdown(app.LinearGrid);
            app.LinearExampleDropDown.Layout.Row = 2;
            app.LinearExampleDropDown.Layout.Column = 1;
            app.LinearExampleDropDown.FontSize = 12;
            app.LinearExampleDropDown.BackgroundColor = [1 1 1];
            app.LinearExampleDropDown.Tooltip = 'Seleccione un sistema lineal precargado';

            app.LoadLinearExampleButton = uibutton(app.LinearGrid, 'push');
            app.LoadLinearExampleButton.Layout.Row = 2;
            app.LoadLinearExampleButton.Layout.Column = 2;
            app.LoadLinearExampleButton.Text = '↧';
            app.LoadLinearExampleButton.FontSize = 18;
            app.LoadLinearExampleButton.FontWeight = 'bold';
            app.LoadLinearExampleButton.FontColor = [1 1 1];
            app.LoadLinearExampleButton.BackgroundColor = app.AccentPurple;
            app.LoadLinearExampleButton.ButtonPushedFcn = createCallbackFcn(app, @LoadLinearExampleButtonPushed, true);
            app.LoadLinearExampleButton.Tooltip = 'Cargar el sistema seleccionado';

            % ----------------------------------------------------------
            % Matriz A
            % ----------------------------------------------------------

            app.MatrixALabel = uilabel(app.LinearGrid);
            app.MatrixALabel.Layout.Row = 3;
            app.MatrixALabel.Layout.Column = 1;
            app.MatrixALabel.Text = 'Matriz A';
            app.MatrixALabel.FontSize = 13;
            app.MatrixALabel.FontWeight = 'bold';
            app.MatrixALabel.FontColor = app.TextColor;

            app.MatrixHelpButton = uibutton(app.LinearGrid, 'push');
            app.MatrixHelpButton.Layout.Row = 3;
            app.MatrixHelpButton.Layout.Column = 2;
            app.MatrixHelpButton.Text = '?';
            app.MatrixHelpButton.FontSize = 15;
            app.MatrixHelpButton.FontWeight = 'bold';
            app.MatrixHelpButton.FontColor = [1 1 1];
            app.MatrixHelpButton.BackgroundColor = app.AccentCyan;
            app.MatrixHelpButton.ButtonPushedFcn = createCallbackFcn(app, @MatrixHelpButtonPushed, true);
            app.MatrixHelpButton.Tooltip = 'Ayuda para ingresar matriz A y vector b';

            app.MatrixATextArea = uitextarea(app.LinearGrid);
            app.MatrixATextArea.Layout.Row = 4;
            app.MatrixATextArea.Layout.Column = [1 2];
            app.MatrixATextArea.FontSize = 13;
            app.MatrixATextArea.FontName = 'Consolas';
            app.MatrixATextArea.FontColor = app.TextColor;
            app.MatrixATextArea.BackgroundColor = app.CardBackground;
            app.MatrixATextArea.Placeholder = '[4 -1 0; -1 4 -1; 0 -1 3]';
            app.MatrixATextArea.Tooltip = 'Ingrese una matriz cuadrada en formato MATLAB';

            % ----------------------------------------------------------
            % Vector b
            % ----------------------------------------------------------

            app.VectorBLabel = uilabel(app.LinearGrid);
            app.VectorBLabel.Layout.Row = 5;
            app.VectorBLabel.Layout.Column = [1 2];
            app.VectorBLabel.Text = 'Vector b';
            app.VectorBLabel.FontSize = 13;
            app.VectorBLabel.FontWeight = 'bold';
            app.VectorBLabel.FontColor = app.TextColor;

            app.VectorBEditField = uieditfield(app.LinearGrid, 'text');
            app.VectorBEditField.Layout.Row = 6;
            app.VectorBEditField.Layout.Column = [1 2];
            app.VectorBEditField.FontSize = 13;
            app.VectorBEditField.FontName = 'Consolas';
            app.VectorBEditField.FontColor = app.TextColor;
            app.VectorBEditField.BackgroundColor = app.CardBackground;
            app.VectorBEditField.Placeholder = '[15; 10; 10]';
            app.VectorBEditField.Tooltip = 'Debe tener el mismo número de filas que la matriz A';

            % ----------------------------------------------------------
            % Botón resolver lineal
            % ----------------------------------------------------------

            app.SolveLinearButton = uibutton(app.LinearGrid, 'push');
            app.SolveLinearButton.Layout.Row = 7;
            app.SolveLinearButton.Layout.Column = [1 2];
            app.SolveLinearButton.Text = 'Resolver y comparar';
            app.SolveLinearButton.FontSize = 15;
            app.SolveLinearButton.FontWeight = 'bold';
            app.SolveLinearButton.FontColor = [1 1 1];
            app.SolveLinearButton.BackgroundColor = app.AccentGreen;
            app.SolveLinearButton.ButtonPushedFcn = createCallbackFcn(app, @SolveLinearButtonPushed, true);
            app.SolveLinearButton.Tooltip = 'Resolver usando Gauss-Jordan y LU';

            % ==========================================================
            % BOTONES GLOBALES DEL PANEL IZQUIERDO
            % ==========================================================

            app.ClearButton = uibutton(app.LeftGrid, 'push');
            app.ClearButton.Layout.Row = 4;
            app.ClearButton.Layout.Column = 1;
            app.ClearButton.Text = 'Limpiar campos';
            app.ClearButton.FontSize = 14;
            app.ClearButton.FontWeight = 'bold';
            app.ClearButton.FontColor = [1 1 1];
            app.ClearButton.BackgroundColor = [0.35 0.38 0.45];
            app.ClearButton.ButtonPushedFcn = createCallbackFcn(app, @ClearButtonPushed, true);
            app.ClearButton.Tooltip = 'Borrar entradas, resultados y gráfica';

            app.HelpButton = uibutton(app.LeftGrid, 'push');
            app.HelpButton.Layout.Row = 5;
            app.HelpButton.Layout.Column = 1;
            app.HelpButton.Text = 'Ayuda rápida / Guía de uso';
            app.HelpButton.FontSize = 14;
            app.HelpButton.FontWeight = 'bold';
            app.HelpButton.FontColor = [1 1 1];
            app.HelpButton.BackgroundColor = app.AccentBlue;
            app.HelpButton.ButtonPushedFcn = createCallbackFcn(app, @HelpButtonPushed, true);
            app.HelpButton.Tooltip = 'Mostrar instrucciones generales de uso';

            % ==========================================================
            % PANEL DERECHO
            % ==========================================================
            % Aquí se encuentra la parte más visual:
            %
            % - Arriba: gráfica 2D/3D.
            % - Abajo: resultados y tabla.
            % ==========================================================

            app.RightPanel = uipanel(app.MainGrid);
            app.RightPanel.Layout.Row = 1;
            app.RightPanel.Layout.Column = 2;
            app.RightPanel.BackgroundColor = app.PanelBackground;
            app.RightPanel.BorderType = 'none';

            app.RightGrid = uigridlayout(app.RightPanel);
            app.RightGrid.RowHeight = {'1.9x', '0.75x'};
            app.RightGrid.ColumnWidth = {'1x'};
            app.RightGrid.Padding = [14 14 14 14];
            app.RightGrid.RowSpacing = 14;
            app.RightGrid.BackgroundColor = app.PanelBackground;

            % ----------------------------------------------------------
            % EJES PRINCIPALES PARA GRÁFICAS
            % ----------------------------------------------------------

            app.MainAxes = uiaxes(app.RightGrid);
            app.MainAxes.Layout.Row = 1;
            app.MainAxes.Layout.Column = 1;
            app.MainAxes.Color = [0.02 0.025 0.035];
            app.MainAxes.XColor = app.TextColor;
            app.MainAxes.YColor = app.TextColor;
            app.MainAxes.ZColor = app.TextColor;
            app.MainAxes.GridColor = [0.35 0.45 0.65];
            app.MainAxes.MinorGridColor = [0.20 0.25 0.35];
            app.MainAxes.FontSize = 12;
            app.MainAxes.Box = 'on';

            title(app.MainAxes, 'Visualización dinámica 2D / 3D', ...
                'Color', app.TextColor, ...
                'FontWeight', 'bold');

            xlabel(app.MainAxes, 'x');
            ylabel(app.MainAxes, 'y');
            zlabel(app.MainAxes, 'z');

            grid(app.MainAxes, 'on');

            % ==========================================================
            % PANEL DE RESULTADOS
            % ==========================================================

            app.ResultsPanel = uipanel(app.RightGrid);
            app.ResultsPanel.Layout.Row = 2;
            app.ResultsPanel.Layout.Column = 1;
            app.ResultsPanel.BackgroundColor = app.CardBackground;
            app.ResultsPanel.BorderType = 'none';

            app.ResultsGrid = uigridlayout(app.ResultsPanel);
            app.ResultsGrid.RowHeight = {38, '1x'};
            app.ResultsGrid.ColumnWidth = {'1x', '1.15x'};
            app.ResultsGrid.Padding = [12 12 12 12];
            app.ResultsGrid.RowSpacing = 10;
            app.ResultsGrid.ColumnSpacing = 12;
            app.ResultsGrid.BackgroundColor = app.CardBackground;

            % ----------------------------------------------------------
            % Resumen superior
            % ----------------------------------------------------------

            app.SummaryLabel = uilabel(app.ResultsGrid);
            app.SummaryLabel.Layout.Row = 1;
            app.SummaryLabel.Layout.Column = [1 2];
            app.SummaryLabel.Text = 'Esperando datos...';
            app.SummaryLabel.FontSize = 16;
            app.SummaryLabel.FontWeight = 'bold';
            app.SummaryLabel.FontColor = app.TextColor;
            app.SummaryLabel.HorizontalAlignment = 'center';

            % ----------------------------------------------------------
            % Área de texto con resultados
            % ----------------------------------------------------------

            app.ResultsTextArea = uitextarea(app.ResultsGrid);
            app.ResultsTextArea.Layout.Row = 2;
            app.ResultsTextArea.Layout.Column = 1;
            app.ResultsTextArea.Editable = 'off';
            app.ResultsTextArea.FontName = 'Consolas';
            app.ResultsTextArea.FontSize = 12;
            app.ResultsTextArea.FontColor = app.TextColor;
            app.ResultsTextArea.BackgroundColor = [0.055 0.070 0.105];
            app.ResultsTextArea.Value = {
                'Resultados aparecerán aquí.'
                ''
                'Seleccione un ejemplo o ingrese sus propios datos.'
                };

            % ----------------------------------------------------------
            % Tabla de pasos / iteraciones / comparación
            % ----------------------------------------------------------

            app.StepsTable = uitable(app.ResultsGrid);
            app.StepsTable.Layout.Row = 2;
            app.StepsTable.Layout.Column = 2;
            app.StepsTable.BackgroundColor = [1 1 1; 0.94 0.97 1.00];
            app.StepsTable.ForegroundColor = [0.05 0.05 0.08];
            app.StepsTable.FontSize = 12;
            app.StepsTable.ColumnName = {'Estado', 'Información'};
            app.StepsTable.Data = {};

            % ----------------------------------------------------------
            % Hacer visible la ventana al final
            % ----------------------------------------------------------

            app.UIFigure.Visible = 'on';
        end










    end


    % ==============================================================
    % MÉTODOS PÚBLICOS DE LA APLICACIÓN
    % ==============================================================
    % Esta sección contiene:
    %
    % 1. Constructor:
    %    Se ejecuta cuando se crea la app.
    %
    % 2. delete:
    %    Se ejecuta cuando se cierra la app.
    % ==============================================================

    methods (Access = public)

        % ==========================================================
        % CONSTRUCTOR DE LA APP
        % ==========================================================
        % Este método se ejecuta automáticamente cuando escribes:
        %
        % app = MetodosNumericosPremiumApp
        %
        % Flujo:
        % 1. Crea todos los componentes visuales.
        % 2. Registra la app en MATLAB.
        % 3. Ejecuta startupFcn para inicializar datos.
        % ==========================================================

        function app = MetodosNumericosPremiumApp

            % Crear la interfaz gráfica completa
            createComponents(app)

            % Registrar la app con App Designer / MATLAB
            registerApp(app, app.UIFigure)

            % Ejecutar configuración inicial
            runStartupFcn(app, @startupFcn)

            % Si el usuario no guarda la variable app,
            % MATLAB limpia la referencia automáticamente.
            if nargout == 0
                clear app
            end
        end


        % ==========================================================
        % DELETE
        % ==========================================================
        % Este método se ejecuta cuando se cierra la aplicación.
        % Su función es eliminar correctamente la ventana principal.
        % ==========================================================

        function delete(app)

            % Verificar que la ventana exista antes de eliminarla
            if ~isempty(app.UIFigure) && isvalid(app.UIFigure)
                delete(app.UIFigure)
            end
        end
    end
end
