classdef MetodosNumericosPremiumApp < matlab.apps.AppBase

    properties (Access = public)
        UIFigure                    matlab.ui.Figure
        MainGrid                    matlab.ui.container.GridLayout

        LeftPanel                   matlab.ui.container.Panel
        LeftGrid                    matlab.ui.container.GridLayout

        TitleLabel                  matlab.ui.control.Label
        SubtitleLabel               matlab.ui.control.Label

        Tabs                        matlab.ui.container.TabGroup
        NewtonTab                   matlab.ui.container.Tab
        LinearTab                   matlab.ui.container.Tab

        NewtonGrid                  matlab.ui.container.GridLayout
        NonlinearSystemLabel        matlab.ui.control.Label
        NonlinearSystemTextArea     matlab.ui.control.TextArea
        InitialGuessLabel           matlab.ui.control.Label
        InitialGuessEditField       matlab.ui.control.EditField
        ToleranceLabel              matlab.ui.control.Label
        ToleranceEditField          matlab.ui.control.NumericEditField
        MaxIterLabel                matlab.ui.control.Label
        MaxIterEditField            matlab.ui.control.NumericEditField
        SolveNewtonButton           matlab.ui.control.Button

        LinearGrid                  matlab.ui.container.GridLayout
        MatrixALabel                matlab.ui.control.Label
        MatrixATextArea             matlab.ui.control.TextArea
        VectorBLabel                matlab.ui.control.Label
        VectorBEditField            matlab.ui.control.EditField
        SolveLinearButton           matlab.ui.control.Button

        ClearButton                 matlab.ui.control.Button
        HelpButton                  matlab.ui.control.Button

        RightPanel                  matlab.ui.container.Panel
        RightGrid                   matlab.ui.container.GridLayout

        MainAxes                    matlab.ui.control.UIAxes
        ResultsPanel                matlab.ui.container.Panel
        ResultsGrid                 matlab.ui.container.GridLayout
        SummaryLabel                matlab.ui.control.Label
        ResultsTextArea             matlab.ui.control.TextArea
        StepsTable                  matlab.ui.control.Table
    end

    properties (Access = private)
        DarkBackground = [0.06 0.08 0.12]
        PanelBackground = [0.10 0.13 0.19]
        CardBackground = [0.13 0.17 0.24]
        AccentBlue = [0.18 0.48 0.95]
        AccentGreen = [0.15 0.75 0.45]
        AccentRed = [0.95 0.28 0.28]
        TextColor = [0.92 0.95 1.00]
        MutedTextColor = [0.68 0.75 0.85]
    end

    methods (Access = private)

        function startupFcn(app)
            app.ResultsTextArea.Value = {
                'Bienvenido a la aplicación premium de Métodos Numéricos.'
                'Seleccione un método, ingrese los datos y presione Resolver.'
                ''
                'Variables permitidas para Newton: x, y, z o x1, x2, x3...'
                'Ejemplo: x^2 + y^2 - 25'
                '         y - 0.75*x - 1'
                };

            app.StepsTable.Data = {};
            app.StepsTable.ColumnName = {'Estado', 'Información'};

            cla(app.MainAxes);
            title(app.MainAxes, 'Visualización dinámica del método');
            xlabel(app.MainAxes, 'x');
            ylabel(app.MainAxes, 'y');
            zlabel(app.MainAxes, 'z');
            grid(app.MainAxes, 'on');
        end

        function SolveNewtonButtonPushed(app, ~)
            try
                eqs = app.parseEquationSystem(app.NonlinearSystemTextArea.Value);
                x0 = app.parseVector(app.InitialGuessEditField.Value);
                tol = app.ToleranceEditField.Value;
                maxIter = app.MaxIterEditField.Value;

                if isempty(eqs)
                    error('INPUT:EMPTY', 'Debe ingresar al menos una ecuación no lineal.');
                end

                if isempty(x0)
                    error('INPUT:X0EMPTY', 'Debe ingresar un vector inicial válido.');
                end

                n = numel(x0);
                m = numel(eqs);

                if m ~= n
                    error('INPUT:DIM', ...
                        'Para Newton-Raphson multivariable, el número de ecuaciones debe ser igual al número de variables del vector inicial.');
                end

                if tol <= 0
                    error('INPUT:TOL', 'La tolerancia debe ser mayor que cero.');
                end

                if maxIter <= 0 || floor(maxIter) ~= maxIter
                    error('INPUT:ITER', 'El número máximo de iteraciones debe ser un entero positivo.');
                end

                fun = @(x) app.evaluateSystem(eqs, x);

                [root, iterations, converged, tableData, colNames] = app.newtonMultivariable(fun, x0, tol, maxIter);

                app.StepsTable.Data = tableData;
                app.StepsTable.ColumnName = colNames;

                Froot = fun(root);
                residual = norm(Froot, inf);

                resultLines = {
                    'MÉTODO: Newton-Raphson Multivariable'
                    ''
                    ['Raíz aproximada: ', app.formatVector(root)]
                    ['Iteraciones realizadas: ', num2str(iterations)]
                    ['Norma del residuo ||F(x)||∞: ', app.formatNumber(residual)]
                    ['Tolerancia usada: ', app.formatNumber(tol)]
                    ''
                };

                if converged
                    resultLines{end+1} = 'Estado: Convergencia alcanzada correctamente.';
                else
                    resultLines{end+1} = 'Estado: No se alcanzó la tolerancia en el máximo de iteraciones.';
                end

                app.ResultsTextArea.Value = resultLines;

                app.plotNonlinearSystem(eqs, root, x0);

                if ~converged
                    uialert(app.UIFigure, ...
                        'El método no alcanzó la tolerancia establecida dentro del número máximo de iteraciones.', ...
                        'Advertencia de convergencia', ...
                        'Icon', 'warning');
                end

            catch ME
                app.showError(ME);
            end
        end

        function SolveLinearButtonPushed(app, ~)
            try
                A = app.parseMatrix(app.MatrixATextArea.Value);
                b = app.parseVector(app.VectorBEditField.Value);

                if isempty(A)
                    error('INPUT:AEMPTY', 'Debe ingresar una matriz A válida.');
                end

                if isempty(b)
                    error('INPUT:BEMPTY', 'Debe ingresar un vector b válido.');
                end

                [rows, cols] = size(A);

                if rows ~= cols
                    error('INPUT:ANOTSQUARE', 'La matriz A debe ser cuadrada.');
                end

                if numel(b) ~= rows
                    error('INPUT:DIMLINEAR', 'El vector b debe tener la misma cantidad de filas que la matriz A.');
                end

                if rcond(A) < 1e-14
                    error('LINEAR:SINGULAR', ...
                        'La matriz A es singular o está muy mal condicionada. No se puede resolver de forma confiable.');
                end

                [xGJ, gjSteps] = app.gaussJordan(A, b);
                [xLU, L, U, P] = app.solveLU(A, b);

                residualGJ = norm(A*xGJ - b(:), inf);
                residualLU = norm(A*xLU - b(:), inf);
                difference = norm(xGJ - xLU, inf);

                tableData = {};
                tableData(end+1, :) = {'Gauss-Jordan', app.formatVector(xGJ), app.formatNumber(residualGJ), 'Solución directa mediante matriz aumentada'};
                tableData(end+1, :) = {'Factorización LU', app.formatVector(xLU), app.formatNumber(residualLU), 'Solución usando PA = LU'};
                tableData(end+1, :) = {'Comparación', app.formatNumber(difference), '-', 'Diferencia infinita entre soluciones'};

                tableData = [tableData; gjSteps];

                app.StepsTable.Data = tableData;
                app.StepsTable.ColumnName = {'Método / Paso', 'Resultado / Operación', 'Residuo', 'Detalle'};

                app.ResultsTextArea.Value = {
                    'MÉTODO: Sistemas de Ecuaciones Lineales'
                    ''
                    'Comparación realizada:'
                    '1. Gauss-Jordan'
                    '2. Factorización LU'
                    ''
                    ['Solución por Gauss-Jordan: ', app.formatVector(xGJ)]
                    ['Solución por LU: ', app.formatVector(xLU)]
                    ['Residuo Gauss-Jordan: ', app.formatNumber(residualGJ)]
                    ['Residuo LU: ', app.formatNumber(residualLU)]
                    ['Diferencia entre soluciones: ', app.formatNumber(difference)]
                    ''
                    'Estado: Sistema resuelto correctamente.'
                    ''
                    'Matriz L:'
                    app.matrixToString(L)
                    ''
                    'Matriz U:'
                    app.matrixToString(U)
                    ''
                    'Matriz P:'
                    app.matrixToString(P)
                    };

                app.plotLinearSystem(A, b, xGJ);

            catch ME
                app.showError(ME);
            end
        end

        function ClearButtonPushed(app, ~)
            app.NonlinearSystemTextArea.Value = {
                'x^2 + y^2 - 25'
                'y - 0.75*x - 1'
                };

            app.InitialGuessEditField.Value = '[4; 4]';
            app.ToleranceEditField.Value = 1e-6;
            app.MaxIterEditField.Value = 50;

            app.MatrixATextArea.Value = {
                '[4 -1 0;'
                ' -1 4 -1;'
                ' 0 -1 3]'
                };

            app.VectorBEditField.Value = '[15; 10; 10]';

            app.ResultsTextArea.Value = {
                'Datos reiniciados correctamente.'
                'Puede ejecutar nuevamente el método que desee.'
                };

            app.StepsTable.Data = {};
            app.StepsTable.ColumnName = {'Estado', 'Información'};

            cla(app.MainAxes);
            title(app.MainAxes, 'Visualización dinámica del método');
            xlabel(app.MainAxes, 'x');
            ylabel(app.MainAxes, 'y');
            zlabel(app.MainAxes, 'z');
            grid(app.MainAxes, 'on');
        end

        function HelpButtonPushed(app, ~)
            msg = sprintf([ ...
                'GUÍA RÁPIDA DE USO\n\n', ...
                'NEWTON-RAPHSON MULTIVARIABLE:\n', ...
                'Ingrese una ecuación por línea. Cada ecuación se interpreta igualada a cero.\n', ...
                'Ejemplo:\n', ...
                'x^2 + y^2 - 25\n', ...
                'y - 0.75*x - 1\n\n', ...
                'También puede escribir:\n', ...
                'x^2 + y^2 = 25\n', ...
                'y = 0.75*x + 1\n\n', ...
                'SISTEMAS LINEALES:\n', ...
                'Ingrese A en formato MATLAB:\n', ...
                '[4 -1 0; -1 4 -1; 0 -1 3]\n\n', ...
                'Ingrese b como vector:\n', ...
                '[15; 10; 10]\n\n', ...
                'La aplicación detecta automáticamente si debe graficar en 2D o 3D.']);

            uialert(app.UIFigure, msg, 'Ayuda de uso', 'Icon', 'info');
        end

        function showError(app, ME)
            switch ME.identifier
                case 'NEWTON:SINGULAR'
                    titleText = 'Jacobiana singular';
                    iconType = 'error';
                case 'NEWTON:DIVERGENCE'
                    titleText = 'Problema de convergencia';
                    iconType = 'warning';
                case 'LINEAR:SINGULAR'
                    titleText = 'Matriz singular';
                    iconType = 'error';
                otherwise
                    titleText = 'Error en los datos o en el cálculo';
                    iconType = 'error';
            end

            uialert(app.UIFigure, ME.message, titleText, 'Icon', iconType);

            app.ResultsTextArea.Value = {
                'No se pudo completar el cálculo.'
                ''
                ['Detalle: ', ME.message]
                ''
                'Revise la sintaxis, dimensiones, tolerancia o condiciones iniciales.'
                };
        end

        function eqs = parseEquationSystem(app, rawValue)
            text = app.textAreaToChar(rawValue);
            text = strtrim(text);

            if isempty(text)
                eqs = {};
                return;
            end

            if startsWith(text, '[') && endsWith(text, ']')
                text = text(2:end-1);
            end

            parts = regexp(text, '[;\n]+', 'split');
            eqs = {};

            for i = 1:numel(parts)
                s = strtrim(parts{i});

                if isempty(s)
                    continue;
                end

                if contains(s, '=')
                    pieces = split(string(s), '=');

                    if numel(pieces) ~= 2
                        error('SYNTAX:EQUATION', ...
                            'Cada ecuación debe tener como máximo un signo igual.');
                    end

                    leftSide = strtrim(char(pieces(1)));
                    rightSide = strtrim(char(pieces(2)));
                    s = ['(', leftSide, ')-(', rightSide, ')'];
                end

                eqs{end+1} = s;
            end
        end

        function text = textAreaToChar(~, rawValue)
            if iscell(rawValue)
                text = strjoin(rawValue, newline);
            elseif isstring(rawValue)
                text = char(strjoin(rawValue, newline));
            else
                text = char(rawValue);
            end
        end

        function v = parseVector(~, text)
            try
                if isstring(text)
                    text = char(text);
                end

                v = str2num(text); %#ok<ST2NM>

                if isempty(v)
                    error('Vector vacío.');
                end

                v = v(:);

            catch
                error('SYNTAX:VECTOR', ...
                    'El vector ingresado no tiene formato válido. Ejemplo válido: [1; 2; 3]');
            end
        end

        function A = parseMatrix(app, rawValue)
            try
                text = app.textAreaToChar(rawValue);
                text = strtrim(text);

                A = str2num(text); %#ok<ST2NM>

                if isempty(A)
                    error('Matriz vacía.');
                end

            catch
                error('SYNTAX:MATRIX', ...
                    'La matriz ingresada no tiene formato válido. Ejemplo válido: [4 -1; 2 3]');
            end
        end

        function F = evaluateSystem(app, eqs, xv)
            F = zeros(numel(eqs), 1);

            for i = 1:numel(eqs)
                F(i) = app.evaluateExpressionScalar(eqs{i}, xv);
            end

            if any(~isfinite(F))
                error('SYNTAX:EVAL', ...
                    'El sistema generó valores no finitos. Revise las ecuaciones o el punto inicial.');
            end
        end

        function val = evaluateExpressionScalar(~, expr, xv)
            try
                xv = xv(:);

                if numel(xv) >= 1
                    x = xv(1); %#ok<NASGU>
                end

                if numel(xv) >= 2
                    y = xv(2); %#ok<NASGU>
                end

                if numel(xv) >= 3
                    z = xv(3); %#ok<NASGU>
                end

                for k = 1:numel(xv)
                    eval(sprintf('x%d = xv(%d);', k, k)); %#ok<EVLDOT>
                end

                e = exp(1); %#ok<NASGU>
                val = eval(expr); %#ok<EVLDOT>

                if numel(val) ~= 1
                    error('La expresión no produjo un escalar.');
                end

                val = double(val);

            catch
                error('SYNTAX:EVAL', ...
                    ['Error al evaluar la expresión: ', expr, ...
                    '. Revise operadores, paréntesis y nombres de variables.']);
            end
        end

        function [root, iterations, converged, tableData, colNames] = newtonMultivariable(app, fun, x0, tol, maxIter)
            x = x0(:);
            n = numel(x);
            converged = false;

            colNames = [{'Iteración'}, ...
                arrayfun(@(j) ['x', num2str(j)], 1:n, 'UniformOutput', false), ...
                {'||F(x)||∞', 'Error aprox.'}];

            tableData = {};

            for k = 1:maxIter
                F = fun(x);
                J = app.finiteJacobian(fun, x);

                if rcond(J) < 1e-14
                    error('NEWTON:SINGULAR', ...
                        ['La matriz Jacobiana es singular o casi singular en la iteración ', ...
                        num2str(k), '. Intente con otro punto inicial.']);
                end

                delta = -J \ F;
                xNew = x + delta;

                approximateError = norm(delta, inf) / max(1, norm(xNew, inf));
                residual = norm(fun(xNew), inf);

                row = cell(1, numel(colNames));
                row{1} = k;

                for j = 1:n
                    row{1+j} = app.formatNumber(xNew(j));
                end

                row{end-1} = app.formatNumber(residual);
                row{end} = app.formatNumber(approximateError);

                tableData(end+1, :) = row;

                x = xNew;

                if approximateError < tol || residual < tol
                    converged = true;
                    break;
                end

                if any(~isfinite(x))
                    error('NEWTON:DIVERGENCE', ...
                        'El método produjo valores infinitos o no numéricos. Posible divergencia.');
                end
            end

            root = x;
            iterations = size(tableData, 1);
        end

        function J = finiteJacobian(~, fun, x)
            x = x(:);
            n = numel(x);
            F0 = fun(x);
            m = numel(F0);
            J = zeros(m, n);

            for j = 1:n
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

        function [x, steps] = gaussJordan(app, A, b)
            [n, m] = size(A);

            if n ~= m
                error('LINEAR:NOTSQUARE', 'La matriz A debe ser cuadrada.');
            end

            b = b(:);
            Aug = [A b];

            steps = {};
            steps(end+1, :) = {'Paso 0', 'Matriz aumentada inicial', '-', app.matrixToString(Aug)};

            for k = 1:n
                [pivotValue, index] = max(abs(Aug(k:n, k)));
                pivotRow = index + k - 1;

                if pivotValue < 1e-14
                    error('LINEAR:SINGULAR', ...
                        ['No existe pivote válido en la columna ', num2str(k), ...
                        '. La matriz es singular o casi singular.']);
                end

                if pivotRow ~= k
                    temp = Aug(k, :);
                    Aug(k, :) = Aug(pivotRow, :);
                    Aug(pivotRow, :) = temp;

                    steps(end+1, :) = { ...
                        ['Paso ', num2str(size(steps, 1))], ...
                        ['Intercambio F', num2str(k), ' ↔ F', num2str(pivotRow)], ...
                        '-', ...
                        app.matrixToString(Aug)};
                end

                pivot = Aug(k, k);
                Aug(k, :) = Aug(k, :) / pivot;

                steps(end+1, :) = { ...
                    ['Paso ', num2str(size(steps, 1))], ...
                    ['Normalizar F', num2str(k), ' dividiendo entre ', app.formatNumber(pivot)], ...
                    '-', ...
                    app.matrixToString(Aug)};

                for i = 1:n
                    if i ~= k
                        factor = Aug(i, k);

                        if abs(factor) > 1e-14
                            Aug(i, :) = Aug(i, :) - factor * Aug(k, :);

                            steps(end+1, :) = { ...
                                ['Paso ', num2str(size(steps, 1))], ...
                                ['F', num2str(i), ' = F', num2str(i), ' - (', ...
                                app.formatNumber(factor), ')F', num2str(k)], ...
                                '-', ...
                                app.matrixToString(Aug)};
                        end
                    end
                end
            end

            x = Aug(:, end);
        end

        function [x, L, U, P] = solveLU(~, A, b)
            if rcond(A) < 1e-14
                error('LINEAR:SINGULAR', ...
                    'La matriz es singular o casi singular. No se puede aplicar LU de forma confiable.');
            end

            [L, U, P] = lu(A);
            y = L \ (P*b(:));
            x = U \ y;
        end

        function plotNonlinearSystem(app, eqs, root, x0)
            cla(app.MainAxes, 'reset');
            hold(app.MainAxes, 'on');
            grid(app.MainAxes, 'on');

            n = numel(root);
            limitBase = max([abs(real(root(:))); abs(real(x0(:))); 2]) + 3;
            limitBase = max(limitBase, 5);

            colors = lines(max(numel(eqs), 3));
            labels = {};

            if n == 2
                for i = 1:min(numel(eqs), 5)
                    try
                        fimplicit(app.MainAxes, ...
                            @(x, y) app.evaluateExpressionGrid2D(eqs{i}, x, y), ...
                            [-limitBase limitBase -limitBase limitBase], ...
                            'LineWidth', 2.2, ...
                            'Color', colors(i, :));

                        labels{end+1} = ['f', num2str(i), '(x,y)=0'];
                    catch
                    end
                end

                if abs(imag(root(1))) < 1e-10 && abs(imag(root(2))) < 1e-10
                    scatter(app.MainAxes, real(root(1)), real(root(2)), ...
                        120, 'filled', ...
                        'MarkerFaceColor', app.AccentGreen, ...
                        'MarkerEdgeColor', [1 1 1]);

                    labels{end+1} = 'Raíz encontrada';
                end

                xlabel(app.MainAxes, 'x');
                ylabel(app.MainAxes, 'y');
                title(app.MainAxes, 'Intersección de funciones no lineales en 2D');
                legend(app.MainAxes, labels, 'Location', 'best');

            elseif n == 3
                view(app.MainAxes, 3);

                for i = 1:min(numel(eqs), 3)
                    try
                        fimplicit3(app.MainAxes, ...
                            @(x, y, z) app.evaluateExpressionGrid3D(eqs{i}, x, y, z), ...
                            [-limitBase limitBase -limitBase limitBase -limitBase limitBase], ...
                            'MeshDensity', 35, ...
                            'FaceAlpha', 0.28, ...
                            'EdgeColor', 'none', ...
                            'FaceColor', colors(i, :));

                        labels{end+1} = ['f', num2str(i), '(x,y,z)=0'];
                    catch
                    end
                end

                if all(abs(imag(root)) < 1e-10)
                    scatter3(app.MainAxes, real(root(1)), real(root(2)), real(root(3)), ...
                        160, 'filled', ...
                        'MarkerFaceColor', app.AccentGreen, ...
                        'MarkerEdgeColor', [1 1 1]);

                    labels{end+1} = 'Raíz encontrada';
                end

                xlabel(app.MainAxes, 'x');
                ylabel(app.MainAxes, 'y');
                zlabel(app.MainAxes, 'z');
                title(app.MainAxes, 'Intersección de superficies no lineales en 3D');

                if ~isempty(labels)
                    legend(app.MainAxes, labels, 'Location', 'best');
                end

            else
                title(app.MainAxes, 'Visualización no disponible para más de 3 variables');
                text(app.MainAxes, 0.5, 0.5, ...
                    'La gráfica solo está disponible para 2 o 3 variables.', ...
                    'Units', 'normalized', ...
                    'HorizontalAlignment', 'center', ...
                    'Color', app.TextColor, ...
                    'FontSize', 14);
            end

            hold(app.MainAxes, 'off');
        end

        function plotLinearSystem(app, A, b, root)
            cla(app.MainAxes, 'reset');
            hold(app.MainAxes, 'on');
            grid(app.MainAxes, 'on');

            n = size(A, 2);
            limitBase = max([abs(real(root(:))); 2]) + 3;
            limitBase = max(limitBase, 5);

            colors = lines(size(A, 1));
            labels = {};

            if n == 2
                xValues = linspace(-limitBase, limitBase, 300);

                for i = 1:size(A, 1)
                    a = A(i, 1);
                    c = A(i, 2);
                    d = b(i);

                    if abs(c) > 1e-14
                        yValues = (d - a*xValues) / c;
                        plot(app.MainAxes, xValues, yValues, ...
                            'LineWidth', 2.3, ...
                            'Color', colors(i, :));
                    elseif abs(a) > 1e-14
                        xLine = d / a;
                        plot(app.MainAxes, [xLine xLine], [-limitBase limitBase], ...
                            'LineWidth', 2.3, ...
                            'Color', colors(i, :));
                    end

                    labels{end+1} = ['Ecuación ', num2str(i)];
                end

                scatter(app.MainAxes, root(1), root(2), ...
                    120, 'filled', ...
                    'MarkerFaceColor', app.AccentGreen, ...
                    'MarkerEdgeColor', [1 1 1]);

                labels{end+1} = 'Solución';

                xlabel(app.MainAxes, 'x');
                ylabel(app.MainAxes, 'y');
                title(app.MainAxes, 'Sistema lineal en 2D');
                legend(app.MainAxes, labels, 'Location', 'best');

            elseif n == 3
                [X, Y] = meshgrid(linspace(-limitBase, limitBase, 25));

                for i = 1:size(A, 1)
                    a = A(i, 1);
                    c = A(i, 2);
                    d = A(i, 3);
                    rhs = b(i);

                    if abs(d) > 1e-14
                        Z = (rhs - a*X - c*Y) / d;

                        surf(app.MainAxes, X, Y, Z, ...
                            'FaceAlpha', 0.28, ...
                            'EdgeColor', 'none', ...
                            'FaceColor', colors(i, :));

                        labels{end+1} = ['Plano ', num2str(i)];
                    end
                end

                scatter3(app.MainAxes, root(1), root(2), root(3), ...
                    160, 'filled', ...
                    'MarkerFaceColor', app.AccentGreen, ...
                    'MarkerEdgeColor', [1 1 1]);

                labels{end+1} = 'Solución';

                xlabel(app.MainAxes, 'x');
                ylabel(app.MainAxes, 'y');
                zlabel(app.MainAxes, 'z');
                title(app.MainAxes, 'Sistema lineal en 3D');
                view(app.MainAxes, 3);

                if ~isempty(labels)
                    legend(app.MainAxes, labels, 'Location', 'best');
                end

            else
                title(app.MainAxes, 'Visualización no disponible para más de 3 variables');
                text(app.MainAxes, 0.5, 0.5, ...
                    'La gráfica solo está disponible para sistemas de 2 o 3 variables.', ...
                    'Units', 'normalized', ...
                    'HorizontalAlignment', 'center', ...
                    'Color', app.TextColor, ...
                    'FontSize', 14);
            end

            hold(app.MainAxes, 'off');
        end

        function val = evaluateExpressionGrid2D(app, expr, x, y)
            try
                expr = app.vectorizeExpression(expr);

                x1 = x; %#ok<NASGU>
                x2 = y; %#ok<NASGU>
                e = exp(1); %#ok<NASGU>

                val = eval(expr); %#ok<EVLDOT>
            catch
                val = nan(size(x));
            end
        end

        function val = evaluateExpressionGrid3D(app, expr, x, y, z)
            try
                expr = app.vectorizeExpression(expr);

                x1 = x; %#ok<NASGU>
                x2 = y; %#ok<NASGU>
                x3 = z; %#ok<NASGU>
                e = exp(1); %#ok<NASGU>

                val = eval(expr); %#ok<EVLDOT>
            catch
                val = nan(size(x));
            end
        end

        function exprOut = vectorizeExpression(~, exprIn)
            try
                exprOut = vectorize(exprIn);
            catch
                exprOut = exprIn;
                exprOut = regexprep(exprOut, '(?<!\.)\^', '.^');
                exprOut = regexprep(exprOut, '(?<!\.)\*', '.*');
                exprOut = regexprep(exprOut, '(?<!\.)/', './');
            end
        end

        function s = formatVector(app, v)
            v = v(:);
            parts = cell(numel(v), 1);

            for i = 1:numel(v)
                parts{i} = app.formatNumber(v(i));
            end

            s = ['[', strjoin(parts, '; '), ']'];
        end

        function s = formatNumber(~, value)
            if isnumeric(value)
                if abs(imag(value)) < 1e-12
                    s = sprintf('%.10g', real(value));
                else
                    s = sprintf('%.10g%+.10gi', real(value), imag(value));
                end
            else
                s = char(value);
            end
        end

        function s = matrixToString(app, M)
            lines = cell(size(M, 1), 1);

            for i = 1:size(M, 1)
                row = cell(1, size(M, 2));

                for j = 1:size(M, 2)
                    row{j} = app.formatNumber(M(i, j));
                end

                lines{i} = ['[', strjoin(row, '   '), ']'];
            end

            s = strjoin(lines, newline);
        end

        function createComponents(app)
            app.UIFigure = uifigure('Visible', 'off');
            app.UIFigure.Position = [100 100 1320 760];
            app.UIFigure.Name = 'Métodos Numéricos Premium - Newton Multivariable y Sistemas Lineales';
            app.UIFigure.Color = app.DarkBackground;

            app.MainGrid = uigridlayout(app.UIFigure);
            app.MainGrid.RowHeight = {'1x'};
            app.MainGrid.ColumnWidth = {430, '1x'};
            app.MainGrid.Padding = [18 18 18 18];
            app.MainGrid.ColumnSpacing = 18;
            app.MainGrid.BackgroundColor = app.DarkBackground;

            app.LeftPanel = uipanel(app.MainGrid);
            app.LeftPanel.Title = '';
            app.LeftPanel.BackgroundColor = app.PanelBackground;
            app.LeftPanel.BorderType = 'none';
            app.LeftPanel.Layout.Row = 1;
            app.LeftPanel.Layout.Column = 1;

            app.LeftGrid = uigridlayout(app.LeftPanel);
            app.LeftGrid.RowHeight = {44, 35, '1x', 42, 42};
            app.LeftGrid.ColumnWidth = {'1x'};
            app.LeftGrid.Padding = [18 18 18 18];
            app.LeftGrid.RowSpacing = 12;
            app.LeftGrid.BackgroundColor = app.PanelBackground;

            app.TitleLabel = uilabel(app.LeftGrid);
            app.TitleLabel.Text = 'Métodos Numéricos';
            app.TitleLabel.FontSize = 25;
            app.TitleLabel.FontWeight = 'bold';
            app.TitleLabel.FontColor = app.TextColor;
            app.TitleLabel.Layout.Row = 1;
            app.TitleLabel.Layout.Column = 1;

            app.SubtitleLabel = uilabel(app.LeftGrid);
            app.SubtitleLabel.Text = 'Newton-Raphson multivariable | Gauss-Jordan | LU';
            app.SubtitleLabel.FontSize = 12;
            app.SubtitleLabel.FontColor = app.MutedTextColor;
            app.SubtitleLabel.Layout.Row = 2;
            app.SubtitleLabel.Layout.Column = 1;

            app.Tabs = uitabgroup(app.LeftGrid);
            app.Tabs.Layout.Row = 3;
            app.Tabs.Layout.Column = 1;

            app.NewtonTab = uitab(app.Tabs);
            app.NewtonTab.Title = 'Newton';
            app.NewtonTab.BackgroundColor = app.PanelBackground;

            app.LinearTab = uitab(app.Tabs);
            app.LinearTab.Title = 'Lineal';
            app.LinearTab.BackgroundColor = app.PanelBackground;

            app.NewtonGrid = uigridlayout(app.NewtonTab);
            app.NewtonGrid.RowHeight = {28, 170, 28, 36, 28, 36, 28, 36, 48};
            app.NewtonGrid.ColumnWidth = {'1x'};
            app.NewtonGrid.Padding = [14 14 14 14];
            app.NewtonGrid.RowSpacing = 8;
            app.NewtonGrid.BackgroundColor = app.PanelBackground;

            app.NonlinearSystemLabel = uilabel(app.NewtonGrid);
            app.NonlinearSystemLabel.Text = 'Sistema no lineal';
            app.NonlinearSystemLabel.FontWeight = 'bold';
            app.NonlinearSystemLabel.FontColor = app.TextColor;
            app.NonlinearSystemLabel.Layout.Row = 1;

            app.NonlinearSystemTextArea = uitextarea(app.NewtonGrid);
            app.NonlinearSystemTextArea.Value = {
                'x^2 + y^2 - 25'
                'y - 0.75*x - 1'
                };
            app.NonlinearSystemTextArea.FontName = 'Consolas';
            app.NonlinearSystemTextArea.FontSize = 13;
            app.NonlinearSystemTextArea.Layout.Row = 2;

            app.InitialGuessLabel = uilabel(app.NewtonGrid);
            app.InitialGuessLabel.Text = 'Vector inicial';
            app.InitialGuessLabel.FontWeight = 'bold';
            app.InitialGuessLabel.FontColor = app.TextColor;
            app.InitialGuessLabel.Layout.Row = 3;

            app.InitialGuessEditField = uieditfield(app.NewtonGrid, 'text');
            app.InitialGuessEditField.Value = '[4; 4]';
            app.InitialGuessEditField.FontName = 'Consolas';
            app.InitialGuessEditField.Layout.Row = 4;

            app.ToleranceLabel = uilabel(app.NewtonGrid);
            app.ToleranceLabel.Text = 'Tolerancia de error';
            app.ToleranceLabel.FontWeight = 'bold';
            app.ToleranceLabel.FontColor = app.TextColor;
            app.ToleranceLabel.Layout.Row = 5;

            app.ToleranceEditField = uieditfield(app.NewtonGrid, 'numeric');
            app.ToleranceEditField.Value = 1e-6;
            app.ToleranceEditField.Limits = [eps Inf];
            app.ToleranceEditField.Layout.Row = 6;

            app.MaxIterLabel = uilabel(app.NewtonGrid);
            app.MaxIterLabel.Text = 'Máximo de iteraciones';
            app.MaxIterLabel.FontWeight = 'bold';
            app.MaxIterLabel.FontColor = app.TextColor;
            app.MaxIterLabel.Layout.Row = 7;

            app.MaxIterEditField = uieditfield(app.NewtonGrid, 'numeric');
            app.MaxIterEditField.Value = 50;
            app.MaxIterEditField.Limits = [1 Inf];
            app.MaxIterEditField.RoundFractionalValues = 'on';
            app.MaxIterEditField.Layout.Row = 8;

            app.SolveNewtonButton = uibutton(app.NewtonGrid, 'push');
            app.SolveNewtonButton.Text = 'Resolver Newton-Raphson';
            app.SolveNewtonButton.FontWeight = 'bold';
            app.SolveNewtonButton.FontSize = 14;
            app.SolveNewtonButton.BackgroundColor = app.AccentBlue;
            app.SolveNewtonButton.FontColor = [1 1 1];
            app.SolveNewtonButton.ButtonPushedFcn = createCallbackFcn(app, @SolveNewtonButtonPushed, true);
            app.SolveNewtonButton.Layout.Row = 9;

            app.LinearGrid = uigridlayout(app.LinearTab);
            app.LinearGrid.RowHeight = {28, 170, 28, 36, 48};
            app.LinearGrid.ColumnWidth = {'1x'};
            app.LinearGrid.Padding = [14 14 14 14];
            app.LinearGrid.RowSpacing = 8;
            app.LinearGrid.BackgroundColor = app.PanelBackground;

            app.MatrixALabel = uilabel(app.LinearGrid);
            app.MatrixALabel.Text = 'Matriz A';
            app.MatrixALabel.FontWeight = 'bold';
            app.MatrixALabel.FontColor = app.TextColor;
            app.MatrixALabel.Layout.Row = 1;

            app.MatrixATextArea = uitextarea(app.LinearGrid);
            app.MatrixATextArea.Value = {
                '[4 -1 0;'
                ' -1 4 -1;'
                ' 0 -1 3]'
                };
            app.MatrixATextArea.FontName = 'Consolas';
            app.MatrixATextArea.FontSize = 13;
            app.MatrixATextArea.Layout.Row = 2;

            app.VectorBLabel = uilabel(app.LinearGrid);
            app.VectorBLabel.Text = 'Vector b';
            app.VectorBLabel.FontWeight = 'bold';
            app.VectorBLabel.FontColor = app.TextColor;
            app.VectorBLabel.Layout.Row = 3;

            app.VectorBEditField = uieditfield(app.LinearGrid, 'text');
            app.VectorBEditField.Value = '[15; 10; 10]';
            app.VectorBEditField.FontName = 'Consolas';
            app.VectorBEditField.Layout.Row = 4;

            app.SolveLinearButton = uibutton(app.LinearGrid, 'push');
            app.SolveLinearButton.Text = 'Resolver y comparar';
            app.SolveLinearButton.FontWeight = 'bold';
            app.SolveLinearButton.FontSize = 14;
            app.SolveLinearButton.BackgroundColor = app.AccentGreen;
            app.SolveLinearButton.FontColor = [1 1 1];
            app.SolveLinearButton.ButtonPushedFcn = createCallbackFcn(app, @SolveLinearButtonPushed, true);
            app.SolveLinearButton.Layout.Row = 5;

            app.ClearButton = uibutton(app.LeftGrid, 'push');
            app.ClearButton.Text = 'Restablecer datos';
            app.ClearButton.FontWeight = 'bold';
            app.ClearButton.BackgroundColor = app.CardBackground;
            app.ClearButton.FontColor = app.TextColor;
            app.ClearButton.ButtonPushedFcn = createCallbackFcn(app, @ClearButtonPushed, true);
            app.ClearButton.Layout.Row = 4;

            app.HelpButton = uibutton(app.LeftGrid, 'push');
            app.HelpButton.Text = 'Ayuda / Formato de entrada';
            app.HelpButton.FontWeight = 'bold';
            app.HelpButton.BackgroundColor = [0.20 0.24 0.32];
            app.HelpButton.FontColor = app.TextColor;
            app.HelpButton.ButtonPushedFcn = createCallbackFcn(app, @HelpButtonPushed, true);
            app.HelpButton.Layout.Row = 5;

            app.RightPanel = uipanel(app.MainGrid);
            app.RightPanel.Title = '';
            app.RightPanel.BackgroundColor = app.PanelBackground;
            app.RightPanel.BorderType = 'none';
            app.RightPanel.Layout.Row = 1;
            app.RightPanel.Layout.Column = 2;

            app.RightGrid = uigridlayout(app.RightPanel);
            app.RightGrid.RowHeight = {'1.2x', '1x'};
            app.RightGrid.ColumnWidth = {'1x'};
            app.RightGrid.Padding = [18 18 18 18];
            app.RightGrid.RowSpacing = 18;
            app.RightGrid.BackgroundColor = app.PanelBackground;

            app.MainAxes = uiaxes(app.RightGrid);
            app.MainAxes.Layout.Row = 1;
            app.MainAxes.Layout.Column = 1;
            app.MainAxes.Color = [0.96 0.97 1.00];
            app.MainAxes.GridColor = [0.55 0.60 0.70];
            app.MainAxes.XColor = [0.10 0.12 0.18];
            app.MainAxes.YColor = [0.10 0.12 0.18];
            app.MainAxes.ZColor = [0.10 0.12 0.18];
            title(app.MainAxes, 'Visualización dinámica del método');

            app.ResultsPanel = uipanel(app.RightGrid);
            app.ResultsPanel.Title = '';
            app.ResultsPanel.BackgroundColor = app.CardBackground;
            app.ResultsPanel.BorderType = 'none';
            app.ResultsPanel.Layout.Row = 2;
            app.ResultsPanel.Layout.Column = 1;

            app.ResultsGrid = uigridlayout(app.ResultsPanel);
            app.ResultsGrid.RowHeight = {28, '1x'};
            app.ResultsGrid.ColumnWidth = {330, '1x'};
            app.ResultsGrid.Padding = [14 14 14 14];
            app.ResultsGrid.ColumnSpacing = 12;
            app.ResultsGrid.BackgroundColor = app.CardBackground;

            app.SummaryLabel = uilabel(app.ResultsGrid);
            app.SummaryLabel.Text = 'Panel de resultados y tabla iterativa';
            app.SummaryLabel.FontWeight = 'bold';
            app.SummaryLabel.FontSize = 15;
            app.SummaryLabel.FontColor = app.TextColor;
            app.SummaryLabel.Layout.Row = 1;
            app.SummaryLabel.Layout.Column = [1 2];

            app.ResultsTextArea = uitextarea(app.ResultsGrid);
            app.ResultsTextArea.Editable = 'off';
            app.ResultsTextArea.FontName = 'Consolas';
            app.ResultsTextArea.FontSize = 12;
            app.ResultsTextArea.Layout.Row = 2;
            app.ResultsTextArea.Layout.Column = 1;

            app.StepsTable = uitable(app.ResultsGrid);
            app.StepsTable.FontName = 'Consolas';
            app.StepsTable.FontSize = 12;
            app.StepsTable.Layout.Row = 2;
            app.StepsTable.Layout.Column = 2;

            app.UIFigure.Visible = 'on';
        end
    end

    methods (Access = public)

        function app = MetodosNumericosPremiumApp
            createComponents(app)
            registerApp(app, app.UIFigure)
            runStartupFcn(app, @startupFcn)

            if nargout == 0
                clear app
            end
        end

        function delete(app)
            delete(app.UIFigure)
        end
    end
end