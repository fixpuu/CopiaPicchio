const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

/**
 * Format makefile to ensure tabs are preserved
 */
function ensureMakefileTabs(makefileContent) {
  const lines = makefileContent.split('\n');
  const formatted = lines.map(line => {
    // If line starts with 2 or more spaces, and looks like a command, replace leading spaces with a tab
    if (/^[ ]{2,}(g\+\+|rm|\.\/|pandoc|cat|echo|touch)/.test(line)) {
      return '\t' + line.trimStart();
    }
    return line;
  });
  return formatted.join('\n');
}

/**
 * Compile and test project files locally
 */
async function testProjectCompilation(projectData) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copiapicchio_'));
  
  try {
    // Write files
    fs.writeFileSync(path.join(tmpDir, 'function.h'), projectData.function_h);
    fs.writeFileSync(path.join(tmpDir, 'function.cpp'), projectData.function_cpp);
    fs.writeFileSync(path.join(tmpDir, 'main.cpp'), projectData.main_cpp);

    const makefile = ensureMakefileTabs(projectData.makefile || '');
    fs.writeFileSync(path.join(tmpDir, 'makefile'), makefile);

    // Write any input data files
    if (Array.isArray(projectData.input_files)) {
      for (const item of projectData.input_files) {
        if (item.filename && item.content) {
          fs.writeFileSync(path.join(tmpDir, item.filename), item.content);
        }
      }
    }

    // Step 1: Compile function.cpp with -Wall -Wconversion
    const res1 = await runCommand('g++ -Wall -Wconversion -c function.cpp', tmpDir);
    if (res1.code !== 0 || res1.stderr.includes('warning:')) {
      return {
        success: false,
        phase: 'compilation_function',
        output: res1.stderr || res1.stdout,
        compilerLog: `g++ -Wall -Wconversion -c function.cpp\n${res1.stderr}`
      };
    }

    // Step 2: Compile main.cpp with -Wall -Wconversion
    const res2 = await runCommand('g++ -Wall -Wconversion -c main.cpp', tmpDir);
    if (res2.code !== 0 || res2.stderr.includes('warning:')) {
      return {
        success: false,
        phase: 'compilation_main',
        output: res2.stderr || res2.stdout,
        compilerLog: `g++ -Wall -Wconversion -c main.cpp\n${res2.stderr}`
      };
    }

    // Step 3: Link executable
    const res3 = await runCommand('g++ -Wall -Wconversion function.o main.o -o a.out', tmpDir);
    if (res3.code !== 0) {
      return {
        success: false,
        phase: 'linking',
        output: res3.stderr || res3.stdout,
        compilerLog: `g++ -Wall -Wconversion function.o main.o -o a.out\n${res3.stderr}`
      };
    }

    // Step 4: Execute program
    const args = Array.isArray(projectData.sample_args) ? projectData.sample_args : [];
    const stdinData = projectData.sample_stdin || '5\n10\n'; // reasonable default for cin if needed
    const execRes = await runExecutable('./a.out', args, tmpDir, stdinData, 3000);

    return {
      success: true,
      compilerLog: `g++ -Wall -Wconversion -c function.cpp\ng++ -Wall -Wconversion -c main.cpp\ng++ -Wall -Wconversion function.o main.o -o a.out\n[OK] 0 errori, 0 warning`,
      executionCommand: `./a.out ${args.join(' ')}`.trim(),
      executionOutput: execRes.stdout + (execRes.stderr ? `\nSTDERR:\n${execRes.stderr}` : ''),
      exitCode: execRes.code
    };
  } finally {
    // Cleanup temporary files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function runCommand(cmd, cwd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd, timeout: 10000 }, (error, stdout, stderr) => {
      resolve({
        code: error ? (error.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || ''
      });
    });
  });
}

function runExecutable(exePath, args, cwd, stdinData, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(exePath, args, { cwd });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    if (stdinData) {
      try {
        proc.stdin.write(stdinData);
        proc.stdin.end();
      } catch (_) {}
    } else {
      proc.stdin.end();
    }

    proc.stdout.on('data', data => { stdout += data.toString(); });
    proc.stderr.on('data', data => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code: timedOut ? 124 : (code ?? 0),
        stdout: stdout || (timedOut ? '[Esecuzione interrotta per timeout]' : ''),
        stderr: stderr
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        code: 1,
        stdout,
        stderr: `Errore di esecuzione: ${err.message}`
      });
    });
  });
}

module.exports = {
  testProjectCompilation,
  ensureMakefileTabs
};
